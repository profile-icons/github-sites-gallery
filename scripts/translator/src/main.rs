use anyhow::{Context, Result, anyhow, bail};
use ort::{
    memory::Allocator,
    session::{Session, SessionInputValue},
    value::{DynValue, Tensor},
};
use serde::Deserialize;
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    env, fs,
    io::{self, BufReader, Read, Write},
    path::{Path, PathBuf},
    time::Duration,
};
use tokenizers::Tokenizer;

const REVISION: &str = "a0d8498bbf489866eeff5e53b53f6997d2b299db";
const MODEL: &str = "https://huggingface.co/casawolice/small100-onnx/resolve";
const FILES: [(&str, Option<&str>); 4] = [
    ("tokenizer.json", None),
    ("lang_tokens.json", None),
    (
        "onnx/encoder_model.onnx",
        Some("a130f553106646e56c1908094074f354353c45d86b3e8d222b037784035e6dcd"),
    ),
    (
        "onnx/decoder_model_merged.onnx",
        Some("f966ce4f1f484c2307dc007ef0beadc3a1651220c1ff9b33ea8dddbce468a4b0"),
    ),
];

fn checksum(path: &Path) -> Result<String> {
    let mut reader = BufReader::new(fs::File::open(path)?);
    let mut hash = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let count = reader.read(&mut buf)?;
        if count == 0 {
            break;
        }
        hash.update(&buf[..count]);
    }
    Ok(hash
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>())
}

fn prepare_model() -> Result<PathBuf> {
    let root = PathBuf::from(
        env::var_os("GALLERY_MODEL_CACHE").unwrap_or_else(|| ".cache/gallery-i18n".into()),
    )
    .join(REVISION);
    fs::create_dir_all(&root)?;
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_connect(Some(Duration::from_secs(30)))
        .timeout_per_read(Some(Duration::from_secs(180)))
        .build()
        .into();
    for (remote, expected) in FILES {
        let local = root.join(remote.rsplit('/').next().unwrap());
        let valid = local.is_file() && local.metadata()?.len() > 0;
        if valid {
            if let Some(expected) = expected {
                if checksum(&local)? == expected {
                    continue;
                }
                eprintln!("Invalid cached checksum; downloading {remote} again.");
                fs::remove_file(&local)?;
            } else {
                continue;
            }
        }
        eprintln!("Downloading {remote}");
        let partial = root.join(format!(
            "{}.{}.part",
            local.file_name().unwrap().to_string_lossy(),
            std::process::id()
        ));
        let result = (|| -> Result<()> {
            let response = agent.get(&format!("{MODEL}/{REVISION}/{remote}")).call()?;
            let mut out = fs::File::create(&partial)?;
            io::copy(&mut response.into_body().into_reader(), &mut out)?;
            out.flush()?;
            drop(out);
            if partial.metadata()?.len() == 0 {
                bail!("Empty model file: {remote}");
            }
            if let Some(expected) = expected
                && checksum(&partial)? != expected
            {
                bail!("Model checksum mismatch: {remote}");
            }
            if local.exists() {
                fs::remove_file(&local)?;
            }
            fs::rename(&partial, &local)?;
            Ok(())
        })();
        if result.is_err() {
            let _ = fs::remove_file(&partial);
        }
        result.with_context(|| format!("Preparing model file {remote}"))?;
    }
    Ok(root)
}

#[derive(Deserialize)]
struct LangTokens {
    lang_to_id: HashMap<String, i64>,
    decoder_start: i64,
    eos: i64,
}

struct Small100 {
    tokenizer: Tokenizer,
    tokens: LangTokens,
    encoder: Session,
    decoder: Session,
    decoder_inputs: HashSet<String>,
    cache_names: Vec<String>,
}

impl Small100 {
    fn new() -> Result<Self> {
        let root = prepare_model()?;
        let tokenizer = Tokenizer::from_file(root.join("tokenizer.json"))
            .map_err(|err| anyhow!("Loading tokenizer: {err}"))?;
        let tokens = serde_json::from_reader(BufReader::new(fs::File::open(
            root.join("lang_tokens.json"),
        )?))?;
        let env = ort::init().with_telemetry(false).build()?;
        let encoder = Session::builder(&env)?.commit_from_file(root.join("encoder_model.onnx"))?;
        let decoder =
            Session::builder(&env)?.commit_from_file(root.join("decoder_model_merged.onnx"))?;
        let decoder_inputs = decoder
            .inputs()
            .iter()
            .map(|input| input.name().to_owned())
            .collect();
        let mut cache_names = Vec::new();
        for layer in 0..3 {
            for kind in ["decoder", "encoder"] {
                for part in ["key", "value"] {
                    cache_names.push(format!("{layer}.{kind}.{part}"));
                }
            }
        }
        Ok(Self {
            tokenizer,
            tokens,
            encoder,
            decoder,
            decoder_inputs,
            cache_names,
        })
    }

    fn translate(&mut self, text: &str, locale: &str) -> Result<String> {
        let language = *self
            .tokens
            .lang_to_id
            .get(locale)
            .with_context(|| format!("Unsupported model language: {locale}"))?;
        let encoding = self
            .tokenizer
            .encode(text, true)
            .map_err(|err| anyhow!("Tokenizing description: {err}"))?;
        let mut ids = vec![language];
        ids.extend(encoding.get_ids().iter().map(|id| i64::from(*id)));
        let len = ids.len();
        let mask = Tensor::from_array(([1usize, len], vec![1i64; len]))?;
        let source = Tensor::from_array(([1usize, len], ids))?;
        let hidden = {
            let output_name = self
                .encoder
                .outputs()
                .first()
                .context("Missing encoder output")?
                .name()
                .to_owned();
            let mut outputs = self
                .encoder
                .run(ort::inputs!["input_ids" => &source, "attention_mask" => &mask])?;
            outputs
                .remove(output_name)
                .context("Missing encoder hidden states")?
        };
        let mut cache: Vec<DynValue> = self
            .cache_names
            .iter()
            .map(|_| {
                Tensor::<f32>::new(&Allocator::default(), [1usize, 16, 0, 64])
                    .map(|tensor| tensor.into_dyn())
            })
            .collect::<ort::Result<_>>()?;
        let mut current = self.tokens.decoder_start;
        let mut result = Vec::<u32>::new();
        for step in 0..512 {
            let input_ids = Tensor::from_array(([1usize, 1], vec![current]))?;
            let branch = Tensor::from_array(([1usize], vec![step > 0]))?;
            let mut inputs: Vec<(String, SessionInputValue<'_>)> = vec![
                ("input_ids".into(), (&input_ids).into()),
                ("encoder_hidden_states".into(), (&hidden).into()),
                ("encoder_attention_mask".into(), (&mask).into()),
                ("use_cache_branch".into(), (&branch).into()),
            ];
            for (name, value) in self.cache_names.iter().zip(&cache) {
                inputs.push((format!("past_key_values.{name}"), value.into()));
            }
            inputs.retain(|(name, _)| self.decoder_inputs.contains(name));
            let mut outputs = self.decoder.run(inputs)?;
            let logits = outputs.remove("logits").context("Missing decoder logits")?;
            let (shape, data) = logits.try_extract_tensor::<f32>()?;
            let vocab = usize::try_from(*shape.last().context("Empty logits shape")?)?;
            if vocab == 0 || data.len() < vocab {
                bail!("Invalid decoder logits");
            }
            let last = &data[data.len() - vocab..];
            let mut best = 0;
            for i in 1..last.len() {
                if last[i] > last[best] {
                    best = i;
                }
            }
            current = i64::try_from(best)?;
            if current == self.tokens.eos {
                return self
                    .tokenizer
                    .decode(&result, true)
                    .map(|text| text.trim().to_owned())
                    .map_err(|err| anyhow!("Decoding translation: {err}"));
            }
            result.push(u32::try_from(current)?);
            for (name, value) in self.cache_names.iter().zip(&mut cache) {
                if step == 0 || name.contains(".decoder.") {
                    *value = outputs
                        .remove(format!("present.{name}"))
                        .with_context(|| format!("Missing decoder cache: {name}"))?;
                }
            }
        }
        Ok(String::new())
    }
}

fn translate_sites(
    sites: &mut [Value],
    locales: &[String],
    mut translate: impl FnMut(&str, &str) -> Result<String>,
) -> Result<()> {
    let mut cache = HashMap::<(String, String), String>::new();
    for site in sites {
        let object = site.as_object_mut().context("Expected a site object")?;
        object.remove("descriptionTranslations");
        let text = object
            .get("description")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_owned();
        if text.trim().is_empty() {
            continue;
        }
        let mut translations = Map::new();
        for locale in locales {
            let key = (text.clone(), locale.clone());
            let translated = cache
                .entry(key)
                .or_insert_with(|| match translate(&text, locale) {
                    Ok(value) => value,
                    Err(_) => {
                        eprintln!("Translation failed for {locale}; using original.");
                        String::new()
                    }
                });
            if !translated.trim().is_empty() {
                translations.insert(locale.clone(), Value::String(translated.clone()));
            }
        }
        if !translations.is_empty() {
            object.insert(
                "descriptionTranslations".into(),
                Value::Object(translations),
            );
        }
    }
    Ok(())
}

fn main() -> Result<()> {
    let locales: Vec<String> = env::args().skip(1).collect();
    let mut sites: Vec<Value> = serde_json::from_reader(io::stdin().lock())?;
    if locales.is_empty()
        || !sites.iter().any(|site| {
            site.get("description")
                .and_then(Value::as_str)
                .is_some_and(|s| !s.trim().is_empty())
        })
    {
        translate_sites(&mut sites, &[], |_, _| unreachable!())?;
    } else {
        eprintln!("Translating descriptions into {}", locales.join(", "));
        let mut model = Small100::new()?;
        translate_sites(&mut sites, &locales, |text, locale| {
            model.translate(text, locale)
        })?;
    }
    serde_json::to_writer(io::stdout().lock(), &sites)?;
    Ok(())
}
