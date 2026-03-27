from fastapi import FastAPI, Request, Header
from fastapi.middleware.cors import CORSMiddleware
import uvicorn, uuid, datetime, os

app = FastAPI(title="MaxAR Maximo Mock API v1.0")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])

ASSETS = [
  {"assetnum":"KEN-TR-001","description":"Power Transformer 132/11kV","siteid":"NAIROBI",
   "location":"Nairobi West Substation","assettype":"TRANSFORMER","status":"OPERATING",
   "manufacturer":"ABB","modelnum":"TRATU","serialnum":"KEN-TR-001-S","installdate":"2018-03-15"},
  {"assetnum":"KEN-GEN-004","description":"Generator Set 20MVA","siteid":"NAIROBI",
   "location":"KenGen Unit 3","assettype":"GENERATOR","status":"OPERATING",
   "manufacturer":"Cummins","modelnum":"C20D5","serialnum":"KEN-GEN-004-S","installdate":"2013-07-22"},
  {"assetnum":"KEN-SWG-007","description":"HV Switchgear Bay 7","siteid":"NAIROBI",
   "location":"Substation A Bay 7","assettype":"SWITCHGEAR","status":"OPERATING",
   "manufacturer":"Schneider","modelnum":"SM6","serialnum":"KEN-SWG-007-S","installdate":"2021-01-10"},
  {"assetnum":"KPC-PMP-003","description":"Centrifugal Pump B","siteid":"NAIROBI",
   "location":"KPC Pump House B","assettype":"PUMP","status":"OPERATING",
   "manufacturer":"Grundfos","modelnum":"NB100","serialnum":"KPC-PMP-003-S","installdate":"2022-05-18"},
  {"assetnum":"KPC-VLV-015","description":"Gate Valve 6-inch","siteid":"NAIROBI",
   "location":"KPC Station B","assettype":"VALVE","status":"OPERATING",
   "manufacturer":"Crane","modelnum":"GV6","serialnum":"KPC-VLV-015-S","installdate":"2023-02-28"},
]
WORK_ORDERS = []
WO_COUNTER = [1000]

@app.get("/maximo/oslc/os/mxasset")
def get_assets():
    return {"member":ASSETS,"totalCount":len(ASSETS),"rdfs:member":ASSETS}

@app.get("/maximo/oslc/os/mxwo")
def get_workorders():
    return {"member":WORK_ORDERS,"totalCount":len(WORK_ORDERS)}

@app.post("/maximo/oslc/os/mxwo")
async def create_wo(request:Request):
    body = await request.json()
    WO_COUNTER[0] += 1
    wo = {"wonum":str(WO_COUNTER[0]),"description":body.get("description",""),"assetnum":body.get("assetnum",""),
          "siteid":body.get("siteid","NAIROBI"),"worktype":body.get("worktype","CM"),
          "priority":body.get("priority","3"),"status":"WAPPR",
          "reportdate":datetime.datetime.now().isoformat(),"reportedby":"MAXAR_VOICE"}
    WORK_ORDERS.append(wo)
    return wo

@app.get("/maximo/oslc/os/mxjp")
def get_jobplans():
    return {"member":[
      {"jobplanid":"JP-TR-001","description":"Transformer inspection procedure",
       "jpnum":"JP-TR-001","jptask":[{"taskid":10,"description":"Visual inspection"},
       {"taskid":20,"description":"Check oil level"},{"taskid":30,"description":"Test protection relay"},
       {"taskid":40,"description":"Record all readings in Maximo"}]}
    ],"totalCount":1}

@app.get("/health")
def health():
    return {"status":"ok","service":"Maximo Mock","assets":len(ASSETS),"workorders":len(WORK_ORDERS)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)