#!/usr/bin/env python3
"""
Voice lab, open-source round: the hardest Nepali lines (lone letters, letter chants, क vs ख)
with free, open-source voices that run on our own machine, to compare by ear with Azure and
ElevenLabs. Run by .github/workflows/voice-lab-open.yml, one engine per Python environment:

    python scripts/voice-lab-open.py light   # kala-tts and Piper (small, CPU)
    python scripts/voice-lab-open.py torch        # OmniVoice (PyTorch, CPU)
    python scripts/voice-lab-open.py chatterbox   # Chatterbox Nepali fine-tune (PyTorch, CPU)

Writes lab/<variant>/<line>.wav and lab/<engine>.json (what each variant is, timings, errors).
scripts/voice-lab-clean.mjs then cleans every clip exactly as the app's clips are cleaned.
"""
import json
import os
import sys
import time
import traceback
import wave

LINES = [
    ("01-ka", "क"),
    ("02-kha", "ख"),
    ("03-ka-chant", "क, कुखुराको क"),
    ("04-kha-chant", "ख, खेतको ख"),
    ("05-jha-chant", "झ, झण्डाको झ"),
    ("06-nga", "ङ"),
    ("07-ksha", "क्ष"),
    ("08-a-chant", "अ, अनारको अ"),
    ("09-number", "सात"),
    ("10-word", "पहेँलो"),
    ("11-cat", "म्याउँ! म बिरालो। आऊ, खेलौँ!"),
    ("12-praise", "नीलो! स्याबास! ठीक डालोमा राख्यौ!"),
    ("13-sentence", "राति भयो। चाँडै सुत्ने बेला भयो!"),
]
OUT = "lab"


def write_wav(path, samples, rate):
    """Float samples (-1..1) or int16 to a 16-bit mono WAV."""
    import numpy as np

    a = np.asarray(samples).squeeze()
    if a.dtype != np.int16:
        a = (np.clip(a.astype("float32"), -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(int(rate))
        w.writeframes(a.tobytes())


LOAD_ERRORS = []


def load_error(what):
    """Remember why an engine could not load (the CI log is not always readable)."""
    LOAD_ERRORS.append({"engine": what, "error": traceback.format_exc()[-1500:]})
    traceback.print_exc()


def run(engine_name, variants):
    """variants: list of (id, description, licence, synth(text) -> (samples, rate))."""
    info = {"engine": engine_name, "variants": [], "report": [], "load_errors": LOAD_ERRORS}
    for vid, desc, licence, synth in variants:
        os.makedirs(os.path.join(OUT, vid), exist_ok=True)
        info["variants"].append({"id": vid, "desc": desc, "licence": licence})
        for lid, text in LINES:
            t0 = time.time()
            try:
                samples, rate = synth(text)
                write_wav(os.path.join(OUT, vid, f"{lid}.wav"), samples, rate)
                info["report"].append({"variant": vid, "line": lid, "ok": True, "secs": round(time.time() - t0, 2)})
            except Exception as e:  # one failing line or voice must not stop the rest
                info["report"].append({"variant": vid, "line": lid, "ok": False, "error": f"{type(e).__name__}: {e}"[:300]})
                traceback.print_exc()
        ok = sum(1 for r in info["report"] if r["variant"] == vid and r["ok"])
        print(f"{vid}: {ok}/{len(LINES)} lines", flush=True)
    with open(os.path.join(OUT, f"{engine_name}.json"), "w") as f:
        json.dump(info, f, ensure_ascii=False, indent=1)


def light():
    variants = []
    # kala-tts: a Nepali-only voice with its own Nepali pronunciation rules (no eSpeak).
    try:
        import io

        import kala_tts
        import numpy as np

        def kala(speaker, speed=1.0):
            def synth(text):
                wav_bytes = kala_tts.synthesize(text, speaker=speaker, speed=speed)
                with wave.open(io.BytesIO(wav_bytes)) as w:
                    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16), w.getframerate()

            return synth

        print("kala-tts speakers:", kala_tts.list_speakers(), flush=True)
        variants += [
            ("K1-kala", "kala-tts, speaker kala", "MIT code, CC BY-SA 4.0 voice", kala("kala")),
            ("K2-kala-slower", "kala-tts, speaker kala, 15% slower", "MIT code, CC BY-SA 4.0 voice", kala("kala", 0.85)),
            ("K3-barsha", "kala-tts, speaker barsha", "MIT code, CC BY-SA 4.0 voice", kala("barsha")),
        ]
    except Exception:
        load_error("kala-tts")

    # Piper: the Nepali voice trained on Google's Nepali recordings (OpenSLR 43), via eSpeak.
    try:
        from huggingface_hub import hf_hub_download
        from piper import PiperVoice, SynthesisConfig

        base = "ne/ne_NP/google/medium/ne_NP-google-medium.onnx"
        model = hf_hub_download("rhasspy/piper-voices", base)
        hf_hub_download("rhasspy/piper-voices", base + ".json")
        voice = PiperVoice.load(model)

        def piper(speaker):
            def synth(text):
                path = "/tmp/piper.wav"
                with wave.open(path, "wb") as w:
                    voice.synthesize_wav(text, w, syn_config=SynthesisConfig(speaker_id=speaker))
                with wave.open(path) as w:
                    import numpy as np

                    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16), w.getframerate()

            return synth

        variants += [
            ("P1-piper-0", "Piper Nepali (Google recordings), speaker 0", "CC BY-SA 4.0 voice", piper(0)),
            ("P2-piper-5", "Piper Nepali (Google recordings), speaker 5", "CC BY-SA 4.0 voice", piper(5)),
        ]
    except Exception:
        load_error("piper")

    # Piper "chitwan": a male Nepali voice from a free (CC0) one-hour recording set.
    try:
        from huggingface_hub import hf_hub_download
        from piper import PiperVoice

        base = "ne/ne_NP/chitwan/medium/ne_NP-chitwan-medium.onnx"
        model = hf_hub_download("rhasspy/piper-voices", base)
        hf_hub_download("rhasspy/piper-voices", base + ".json")
        chitwan = PiperVoice.load(model)

        def chitwan_synth(text):
            import numpy as np

            path = "/tmp/chitwan.wav"
            with wave.open(path, "wb") as w:
                chitwan.synthesize_wav(text, w)
            with wave.open(path) as w:
                return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16), w.getframerate()

        variants.append(("P3-chitwan", "Piper Nepali, chitwan (male)", "CC0 recordings", chitwan_synth))
    except Exception:
        load_error("piper-chitwan")
    run("light", variants)


def torch_engines():
    import numpy as np
    import torch

    torch.set_num_threads(os.cpu_count() or 4)
    variants = []
    # OmniVoice (k2-fsa; Nepali is one of its 600+ languages). Two ways to choose a voice:
    # "design" (describe it: female, child, male…) and "clone" (copy a voice from a short clip).
    # (The WiseYak Nepali fine-tune is no longer public.)
    try:
        from omnivoice import OmniVoice

        model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cpu", dtype=torch.float32)

        def omni(**voice):
            def synth(text):
                audio = model.generate(text=text, language="npi", **voice)
                return np.asarray(audio[0]), 24000

            return synth

        lic = "Code Apache 2.0, model CC BY-NC (non-commercial)"
        variants += [
            ("O1-omni-woman", "OmniVoice, designed: female, young adult", lic, omni(instruct="female, young adult, moderate pitch")),
            ("O2-omni-child", "OmniVoice, designed: female, child", lic, omni(instruct="female, child, high pitch")),
            ("O3-omni-man", "OmniVoice, designed: male, young adult", lic, omni(instruct="male, young adult, moderate pitch")),
        ]
        ref = os.environ.get("CLONE_REF")
        if ref and os.path.exists(ref):
            variants.append(("O4-omni-clone", "OmniVoice, voice copied from kala-tts", lic, omni(ref_audio=ref, ref_text=os.environ.get("CLONE_TEXT", ""))))
    except Exception:
        load_error("omnivoice")
    run("torch", variants)


def chatterbox():
    import numpy as np
    import torch

    torch.set_num_threads(os.cpu_count() or 4)
    variants = []
    # Chatterbox Multilingual (Resemble AI, MIT) with a community fine-tune for Nepali (MIT):
    # the fine-tuned "T3" part replaces the original. It copies a voice from a short clip.
    try:
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        from huggingface_hub import hf_hub_download
        from safetensors.torch import load_file

        tts = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
        state = load_file(hf_hub_download("waglesameer5/chatterbox-nepali", "t3_mtl_nepali_final.safetensors"))
        if "model" in state:
            state = state["model"][0]
        missing, unexpected = tts.t3.load_state_dict(state, strict=False)
        print("chatterbox nepali weights: missing", len(missing), "unexpected", len(unexpected), flush=True)
        ref = os.environ.get("CLONE_REF")

        def cb(text):
            wav = tts.generate(text, language_id="hi", audio_prompt_path=ref)
            return wav.squeeze().numpy(), tts.sr

        variants.append(("N1-chatterbox", "Chatterbox, Nepali fine-tune, voice copied from kala-tts", "MIT", cb))
    except Exception:
        load_error("chatterbox")
    run("chatterbox", variants)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    {"light": light, "torch": torch_engines, "chatterbox": chatterbox}[sys.argv[1]]()
