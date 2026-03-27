from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests, json, os, time
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="MaxAR Voice WO Bridge")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])

_iam_token = {"token":None,"expires":0}

class TranscriptionRequest(BaseModel):
    transcription: str

class WOResponse(BaseModel):
    wo_number: str
    asset_id: str
    fault_description: str
    priority: int
    required_trade: str
    location: str
    elapsed_seconds: float

def get_iam_token() -> str:
    if _iam_token["token"] and time.time() < _iam_token["expires"]:
        return _iam_token["token"]
    resp = requests.post(
        "https://iam.cloud.ibm.com/identity/token",
        data={"grant_type":"urn:ibm:params:oauth:grant-type:apikey",
              "apikey":os.environ["WATSONX_APIKEY"]},
        headers={"Content-Type":"application/x-www-form-urlencoded"}
    )
    resp.raise_for_status()
    data = resp.json()
    _iam_token["token"] = data["access_token"]
    _iam_token["expires"] = time.time() + data["expires_in"] - 60
    return _iam_token["token"]

SYSTEM_PROMPT = """You are a Maximo work order assistant for East African field engineers
at KenGen and KPC sites in Nairobi, Kenya. Extract work order fields
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
  KEN-TR-001, KEN-GEN-004, KEN-SWG-007, KPC-PMP-003, KPC-VLV-015

LOCATION DEFAULTS (use when not stated in input):
  KEN-TR-001  -> Unit 3 control room
  KEN-GEN-004 -> Generator hall north
  KEN-SWG-007 -> Substation A feeder bay
  KPC-PMP-003 -> Pump house B
  KPC-VLV-015 -> Pump house B

FAULT DESCRIPTION MAPPINGS:
  overheating / temperature reads X degrees -> "Overheating -- temperature XC"
  humming sound / making a humming -> "Abnormal noise -- humming sound"
  inafanya kelele / making noise -> "Unusual noise on asset -- requires inspection"
  vibrating too much / bearing probably gone -> "Excessive vibration -- bearing suspected"
  oil leaking / found oil leaking -> "Oil leak at base flange"
  oil level low / low oil level -> "Low oil level in conservator"
  tripped on overcurrent relay -> "Overcurrent relay trip -- inspection required"
  tripped on earth fault relay -> "Earth fault relay trip"
  low oil pressure alarm / showing low oil alarm -> "Low oil pressure alarm"
  not building pressure / suction side issue -> "Low pressure -- possible suction fault"
  burning smell -> "Burning smell from bay 3"
  stuck closed / cannot open -> "Valve seized -- manual operation failed"
  metal hitting metal -> "Metallic noise -- possible mechanical failure"
  stem packing leak -> "Stem packing leak"

PRIORITY RULES:
  If "priority N" or "priority priority N" appears -> use that number
  stop it now / shut down now / immediately -> 1
  urgent / ASAP / haraka / need mechanic urgent -> 1
  high / priority high -> 2
  normal / not stated -> 3
  when you can -> 4
  planning -> 5

REQUIRED_TRADE RULES (never return null):
  If trade not stated -> INSTRUMENTATION (most common default)
  electrician / umeme / fundi wa umeme / relay trip -> ELECTRICIAN
  mechanic / fitter / fundi / bearing / vibration / need fitter ASAP -> MECHANICAL_FITTER
  burning smell (no other trade word) -> WELDER

PIDGIN PATTERN:
  "hii [ASSET-ID] inafanya kelele nyingi, tafadhali angalia"
  -> fault: "Unusual noise on asset -- requires inspection"
  -> extract asset_id directly from string
  -> priority: 2, required_trade: INSTRUMENTATION

SAFETY NOTES (extract only if stated, else ""):
  Lockout/Tagout required | Standard PPE sufficient
  No special hazards identified | PPE: class E hard hat + arc flash
  Slip hazard present | Isolate before work"""

def extract_wo_fields(transcription: str) -> dict:
    token = get_iam_token()
    full_input = f"{SYSTEM_PROMPT}\n\nVoice input: {transcription}\n\nJSON:"
    payload = {"model_id":"ibm/granite-13b-instruct-v2","input":full_input,
               "parameters":{"decoding_method":"greedy","max_new_tokens":400,"repetition_penalty":1.0},
               "project_id":os.environ["WATSONX_PROJECT_ID"]}
    resp = requests.post(
        f"{os.environ['WATSONX_URL']}/ml/v1/text/generation?version=2023-05-29",
        json=payload,
        headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"}
    )
    resp.raise_for_status()
    raw = resp.json()["results"][0]["generated_text"].strip()
    start = raw.find("{"); end = raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON in response: {raw}")
    return json.loads(raw[start:end])

def create_maximo_wo(fields: dict) -> str:
    payload = {"description":fields.get("fault_description","Voice WO"),
               "assetnum":fields.get("asset_id") or "UNKNOWN",
               "siteid":os.environ.get("MAXIMO_SITE_ID","NAIROBI"),
               "worktype":"CM","priority":str(fields.get("priority",3)),"status":"WAPPR"}
    resp = requests.post(
        f"{os.environ['MAXIMO_BASE_URL']}/maximo/oslc/os/mxwo",
        json=payload,
        headers={"apikey":os.environ["MAXIMO_API_KEY"],"Content-Type":"application/json"}
    )
    resp.raise_for_status()
    return resp.json().get("wonum","UNKNOWN")

@app.post("/voice-to-wo", response_model=WOResponse)
async def voice_to_wo(req: TranscriptionRequest):
    if not req.transcription.strip():
        raise HTTPException(status_code=400,detail="Empty transcription")
    start = time.time()
    try:
        fields = extract_wo_fields(req.transcription)
        wo_num = create_maximo_wo(fields)
    except Exception as e:
        raise HTTPException(status_code=500,detail=str(e))
    return WOResponse(
        wo_number=wo_num,asset_id=fields.get("asset_id") or "UNKNOWN",
        fault_description=fields.get("fault_description",""),
        priority=int(fields.get("priority",3)),
        required_trade=fields.get("required_trade","INSTRUMENTATION"),
        location=fields.get("location","Nairobi, Kenya"),
        elapsed_seconds=round(time.time()-start,2)
    )

@app.get("/assets")
def get_assets():
    resp = requests.get(f"{os.environ['MAXIMO_BASE_URL']}/maximo/oslc/os/mxasset?_format=json",
                        headers={"apikey":os.environ["MAXIMO_API_KEY"]})
    return resp.json()

@app.get("/workorders")
def get_workorders():
    resp = requests.get(f"{os.environ['MAXIMO_BASE_URL']}/maximo/oslc/os/mxwo?_format=json",
                        headers={"apikey":os.environ["MAXIMO_API_KEY"]})
    return resp.json()

@app.get("/health")
def health():
    return {"status":"ok","maximo":os.environ["MAXIMO_BASE_URL"],"watsonx":os.environ["WATSONX_URL"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app,host=os.environ.get("APP_HOST","0.0.0.0"),
                    port=int(os.environ.get("APP_PORT","8000")))