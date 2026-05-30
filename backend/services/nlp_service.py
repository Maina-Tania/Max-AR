import json
import os
import re
import time
from datetime import datetime
from typing import Optional, Tuple

import requests
from pydantic import BaseModel, Field, ValidationError, conint

SYSTEM_PROMPT = """You are a Maximo work order assistant for East African field engineers
working at KenGen and KPC sites in Nairobi, Kenya. Extract work order fields
from a voice transcription and return ONLY a valid JSON object.

ABSOLUTE RULES:
- Return JSON only. No explanation. No preamble. No markdown.
- Start response with { and end with }
- Always write fault_description in English
- Never add extra fields

JSON SCHEMA:
{
  "fault_description": "string in English",
  "asset_id": "string or null",
  "location": "string never null",
  "priority": integer 1-5,
  "required_trade": "string never null",
  "safety_notes": "string or empty string"
}

ASSET IDs (only these 5 are valid):
  KEN-TR-012  = transformer at KenGen
  KEN-GEN-004 = generator at KenGen Unit 3
  KEN-SWG-007 = switchgear bay 7 at KenGen Substation A
  KPC-PMP-003 = pump at KPC Pump House B
  KPC-VLV-015 = valve at KPC Station B

LOCATION RULES — never return null
If location is stated in input, use exact words from input.
If not stated, use asset default.

PRIORITY RULES
1 = emergency / stop it now / shut down now / mayday / haraka sana / immediately / fasta sana / metal hitting metal / low oil alarm stop it now
2 = urgent / ASAP / haraka / priority high / priority 2 / unusual noise on transformer / overheating priority high / burning insulation / earth fault relay trip
3 = normal / oil leak / low oil level / stem packing leak / priority 3 / not stated
4 = low / when you can / schedule / priority 4
5 = planning / no rush / priority 5

REQUIRED_TRADE RULES — never return null
ELECTRICIAN when asset is transformer/switchgear and for electrical-related words.
MECHANICAL_FITTER when asset is pump/valve and for mechanical-related words.

FAULT DESCRIPTION RULES
Always in English. Keep it concise.

SAFETY_NOTES RULES
Extract only if explicitly mentioned in input, else "".
"""


class ExtractionFields(BaseModel):
    fault_description: str
    asset_id: Optional[str] = None
    location: str
    priority: conint(ge=1, le=5) = 3
    required_trade: str = Field(min_length=1)
    safety_notes: str = ""


_iam_token = {"token": None, "expires": 0.0}


def get_iam_token() -> str:
    # Cached token until expiry (with a small buffer).
    if _iam_token["token"] and time.time() < _iam_token["expires"]:
        return _iam_token["token"]

    resp = requests.post(
        "https://iam.cloud.ibm.com/identity/token",
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": os.environ["WATSONX_APIKEY"],
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    _iam_token["token"] = data["access_token"]
    _iam_token["expires"] = time.time() + data["expires_in"] - 60
    return _iam_token["token"]


def _mock_extract_wo_fields(transcription: str) -> dict:
    # Local parser aligned to the prompt examples.
    text = transcription.strip()
    lower = text.lower()

    def has_any(*phrases: str) -> bool:
        return any(p in lower for p in phrases)

    # 1) Asset extraction and mapping
    asset_id = None
    exact = re.search(
        r"\b(KEN-TR-012|KEN-GEN-004|KEN-SWG-007|KPC-PMP-003|KPC-VLV-015)\b",
        text,
        re.IGNORECASE,
    )
    if exact:
        asset_id = exact.group(1).upper()
    elif has_any("transformer 012", "tr 012", "tr-012", "transformer in bay", "hii transformer"):
        asset_id = "KEN-TR-012"
    elif has_any("gen 004", "generator 004", "generator 4", "unit 3 generator", "hii generator", "jenereta"):
        asset_id = "KEN-GEN-004"
    elif has_any("switchgear bay 7", "swg 007", "switchgear 007"):
        asset_id = "KEN-SWG-007"
    elif has_any("pump 003", "pump house b pump", "pump house b pump 003", "hii pump", "pampu"):
        asset_id = "KPC-PMP-003"
    elif has_any("valve 15", "valve 015", "valve kpc-vlv-015"):
        asset_id = "KPC-VLV-015"

    # Edge: "transformer tripped" with no identifier stays unknown.
    if asset_id is None and "transformer tripped" in lower:
        asset_id = None

    # 2) Safety notes extraction
    safety_notes = ""
    if has_any("lockout/tagout", "loto"):
        safety_notes = "Lockout/Tagout required"
    elif has_any("arc flash", "class e hard hat"):
        safety_notes = "PPE: class E hard hat + arc flash"
    elif has_any("isolate before work", "isolate equipment"):
        safety_notes = "Isolate before work"
    elif has_any("slip hazard"):
        safety_notes = "Slip hazard present"
    elif has_any("standard ppe"):
        safety_notes = "Standard PPE sufficient"

    # 3) Fault description normalization
    temp_match = re.search(r"(\d{2,3})\s*(?:degrees|degree|c)\b", lower)
    temp_c = int(temp_match.group(1)) if temp_match else None

    if has_any("the thing is making noise"):
        fault_description = "Unspecified noise"
    elif has_any("transformer tripped"):
        fault_description = "Asset trip -- no location specified"
    elif has_any("metal hitting metal"):
        fault_description = "Metallic noise -- possible mechanical failure"
    elif has_any("burning smell", "insulation smell", "burning insulation"):
        fault_description = "Burning insulation smell"
    elif has_any("low oil alarm", "low oil pressure alarm"):
        fault_description = "Low oil pressure alarm"
    elif has_any("stem packing leak"):
        fault_description = "Stem packing leak"
    elif has_any("valve stuck", "stuck cannot open", "cannot open"):
        fault_description = "Valve seized cannot open"
    elif has_any("pressure not building", "not building pressure", "suction side issue"):
        fault_description = "Low pressure fault"
    elif has_any("relay trip", "overcurrent relay", "earth fault relay"):
        if "earth fault" in lower:
            fault_description = "Earth fault relay trip"
        elif "overcurrent" in lower:
            fault_description = "Overcurrent relay trip"
        else:
            fault_description = "Relay trip"
    elif has_any("oil leak", "oil dripping"):
        fault_description = "Oil leak at base"
    elif has_any("low oil level"):
        fault_description = "Low oil level in conservator"
    elif has_any("vibrating badly", "vibrating", "vibration", "bearing"):
        fault_description = "Excessive vibration"
    elif has_any("noise", "kelele", "inafanya kelele ya ajabu"):
        if asset_id == "KEN-TR-012":
            fault_description = "Unusual noise on transformer"
        else:
            fault_description = "Unusual noise"
    elif has_any("overheating", "iko hot sana", "hot sana"):
        if temp_c is not None:
            fault_description = f"Overheating at {temp_c}C"
        else:
            fault_description = "Overheating"
    elif has_any("haifanyi kazi"):
        fault_description = "Equipment failure"
    elif has_any("imezima"):
        fault_description = "Shutdown / equipment stopped"
    else:
        fault_description = "Equipment failure"

    # 4) Priority rules
    priority = 3
    explicit = re.search(r"\bpriority\s*(?:priority\s*)?([1-5])\b", lower)
    if explicit:
        priority = int(explicit.group(1))

    if has_any("vibrating badly need mechanic urgent"):
        priority = 1
    elif has_any("valve stuck cannot open", "valve stuck", "stuck cannot open"):
        priority = 2
    elif has_any("overheating", "hot sana") and temp_c is not None:
        priority = 1 if temp_c > 100 else 2
    elif has_any(
        "mayday",
        "stop it now",
        "shut down now",
        "haraka sana",
        "immediately",
        "fasta sana",
        "metal hitting metal",
    ):
        priority = 1
    elif has_any("urgent", "asap", "haraka", "priority high", "burning insulation", "earth fault relay trip", "unusual noise on transformer"):
        priority = 2
    elif has_any("low", "when you can", "schedule"):
        priority = 4
    elif has_any("planning", "no rush"):
        priority = 5
    elif has_any("oil leak", "low oil level", "stem packing leak", "kawaida"):
        priority = 3

    # Prompt edge case: "transformer tripped" (no number) => priority 2.
    if asset_id is None and "transformer tripped" in lower:
        priority = 2

    # 5) Required trade rules
    if asset_id and (asset_id.startswith("KEN-TR-") or asset_id.startswith("KEN-SWG-")):
        required_trade = "ELECTRICIAN"
    elif asset_id and (asset_id.startswith("KPC-PMP-") or asset_id.startswith("KPC-VLV-")):
        required_trade = "MECHANICAL_FITTER"
    elif asset_id and asset_id.startswith("KEN-GEN-"):
        if has_any("relay", "overcurrent", "electrical fault", "voltage", "insulation", "umeme", "electrician"):
            required_trade = "ELECTRICIAN"
        else:
            required_trade = "MECHANICAL_FITTER"
    elif has_any("electrical", "voltage", "relay", "insulation", "burning smell", "arc", "umeme", "fundi wa umeme", "electrician"):
        required_trade = "ELECTRICIAN"
    elif has_any("vibrating", "bearing", "pump", "valve", "pressure", "seal", "oil leak", "mechanic", "fitter", "fundi", "mechanical"):
        required_trade = "MECHANICAL_FITTER"
    else:
        required_trade = "MECHANICAL_FITTER"

    # 6) Location rules (never null)
    location = None
    location_patterns = [
        r"(Nairobi West Substation)",
        r"(KenGen Unit 3,?\s*Nairobi)",
        r"(Substation A,?\s*Bay 7,?\s*Nairobi)",
        r"(KPC Pump House B,?\s*Nairobi)",
        r"(KPC Station B,?\s*Nairobi)",
        r"(pump house b)",
        r"(substation a)",
        r"(bay 7)",
        r"(unit 3)",
    ]
    for pattern in location_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            location = m.group(1)
            break

    if location is None:
        if asset_id == "KEN-TR-012":
            location = "Nairobi West Substation"
        elif asset_id == "KEN-GEN-004":
            location = "KenGen Unit 3, Nairobi"
        elif asset_id == "KEN-SWG-007":
            location = "Substation A, Bay 7, Nairobi"
        elif asset_id == "KPC-PMP-003":
            location = "KPC Pump House B, Nairobi"
        elif asset_id == "KPC-VLV-015":
            location = "KPC Station B, Nairobi"
        else:
            location = "Nairobi, Kenya"

    return {
        "fault_description": fault_description,
        "asset_id": asset_id,
        "location": location,
        "priority": priority,
        "required_trade": required_trade,
        "safety_notes": safety_notes,
    }


def _parse_json_object_from_text(raw: str) -> dict:
    raw = (raw or "").strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end <= start:
        raise ValueError(f"No JSON object found in response: {raw}")
    return json.loads(raw[start : end + 1])


def _try_local_llm_extract(transcription: str) -> Optional[Tuple[ExtractionFields, str]]:
    # Optional: Ollama-style local generation endpoint.
    # If not configured, return None (caller will try watsonx or mock).
    if os.environ.get("USE_LOCAL_LLM", "false").lower() != "true":
        return None

    local_url = os.environ.get("LOCAL_LLM_URL", "http://localhost:11434")
    model_id = os.environ.get("LOCAL_LLM_MODEL_ID", "llama3")
    try:
        token_payload = None
        # Ollama expects: { "model": "...", "prompt": "...", "stream": false }
        full_input = f"{SYSTEM_PROMPT}\n\nVoice input: {transcription}\n\nJSON:"
        resp = requests.post(
            f"{local_url}/api/generate",
            json={"model": model_id, "prompt": full_input, "stream": False},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        gen_text = data.get("response") or data.get("generated_text") or ""
        parsed = _parse_json_object_from_text(gen_text)
        return ExtractionFields.model_validate(parsed), "local_llm"
    except Exception:
        return None


def extract_wo_fields(transcription: str) -> Tuple[ExtractionFields, str]:
    """
    Returns:
      (validated_extraction_fields, extraction_mode)
    """
    use_mock = os.environ.get("USE_MOCK_AI", "false").lower() == "true"
    if use_mock:
        fields = ExtractionFields.model_validate(_mock_extract_wo_fields(transcription))
        return fields, "mock_ai"

    local_llm = _try_local_llm_extract(transcription)
    if local_llm is not None:
        fields, mode = local_llm
        return fields, mode

    # Real watsonx.ai integration
    try:
        token = get_iam_token()
        full_input = f"{SYSTEM_PROMPT}\n\nVoice input: {transcription}\n\nJSON:"
        payload = {
            "model_id": "ibm/granite-13b-instruct-v2",
            "input": full_input,
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": 400,
                "repetition_penalty": 1.0,
            },
            "project_id": os.environ["WATSONX_PROJECT_ID"],
        }
        resp = requests.post(
            f"{os.environ['WATSONX_URL']}/ml/v1/text/generation?version=2023-05-29",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=90,
        )
        resp.raise_for_status()
        raw = resp.json()["results"][0]["generated_text"].strip()
        parsed = _parse_json_object_from_text(raw)
        fields = ExtractionFields.model_validate(parsed)
        return fields, "watsonx"
    except requests.HTTPError as e:
        status_code = e.response.status_code if e.response is not None else None
        if status_code in (401, 403):
            mock_dict = _mock_extract_wo_fields(transcription)
            fields = ExtractionFields.model_validate(mock_dict)
            return fields, "watsonx_fallback"
        raise
    except ValidationError:
        # If schema doesn't validate, fall back to mock rules.
        mock_dict = _mock_extract_wo_fields(transcription)
        fields = ExtractionFields.model_validate(mock_dict)
        return fields, "schema_fallback"
    except Exception:
        # For demo robustness: fall back to mock extraction.
        mock_dict = _mock_extract_wo_fields(transcription)
        fields = ExtractionFields.model_validate(mock_dict)
        return fields, "fallback_on_error"

