from fastapi import FastAPI, Query
from service.oracle import fetch_feeds, aggregate

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "ok", "service": "oracle-updater"}

@app.post("/oracle/feeds")
async def get_feeds():
    try:
        return await fetch_feeds(save=True)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


@app.post("/oracle/aggregate")
async def run_aggregate():
    try:
        return await aggregate()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}