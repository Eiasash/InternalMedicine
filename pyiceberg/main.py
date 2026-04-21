"""Create a first Iceberg table in the Supabase-hosted REST catalog.

Credentials are read from environment variables so no secrets are committed.
Copy `.env.example` to `.env` and fill in the masked values from the Supabase
bucket "Connection details" panel, then run:

    uv run main.py
"""

import datetime
import os

import pyarrow as pa
from pyiceberg.catalog import load_catalog

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "krmlzwwelqvlfslwltol")

WAREHOUSE = os.environ.get("ICEBERG_WAREHOUSE", "question-images")
TOKEN = os.environ["ICEBERG_TOKEN"]

S3_ACCESS_KEY = os.environ["S3_ACCESS_KEY_ID"]
S3_SECRET_KEY = os.environ["S3_SECRET_ACCESS_KEY"]
S3_REGION = os.environ.get("S3_REGION", "eu-west-1")
S3_ENDPOINT = f"https://{PROJECT_REF}.storage.supabase.co/storage/v1/s3"
CATALOG_URI = f"https://{PROJECT_REF}.storage.supabase.co/storage/v1/iceberg"

catalog = load_catalog(
    "supabase",
    type="rest",
    warehouse=WAREHOUSE,
    uri=CATALOG_URI,
    token=TOKEN,
    **{
        "py-io-impl": "pyiceberg.io.pyarrow.PyArrowFileIO",
        "s3.endpoint": S3_ENDPOINT,
        "s3.access-key-id": S3_ACCESS_KEY,
        "s3.secret-access-key": S3_SECRET_KEY,
        "s3.region": S3_REGION,
        "s3.force-virtual-addressing": False,
    },
)

print("Creating catalog 'default'...")
catalog.create_namespace_if_not_exists("default")

schema = pa.schema(
    [
        pa.field("event_id", pa.int64()),
        pa.field("event_name", pa.string()),
        pa.field("event_timestamp", pa.timestamp("ms")),
    ]
)

print("Creating table 'events'...")
table = catalog.create_table_if_not_exists(("default", "events"), schema=schema)

print("Preparing sample data to be inserted...")
current_time = datetime.datetime.now()
data = pa.table(
    {
        "event_id": [1, 2, 3],
        "event_name": ["login", "logout", "purchase"],
        "event_timestamp": [current_time, current_time, current_time],
    }
)

print("Inserting data into 'events'...")
table.append(data)

print("Completed!")
df = table.scan().to_pandas()
print(df)
