# PyIceberg first table

Quickstart that creates a `default.events` Iceberg table in the Supabase-hosted
REST catalog and inserts three sample rows.

## Setup

```bash
# Install uv (once)
curl -LsSf https://astral.sh/uv/install.sh | sh

# From this directory
cd pyiceberg
uv sync
cp .env.example .env
# Edit .env and paste the token / S3 keys from the Supabase bucket
# "Connection details" panel.
```

## Run

```bash
uv run --env-file .env main.py
```

Expected output: the namespace `default` and table `events` are created (idempotent),
three rows are appended, and the table is scanned back into a pandas DataFrame.

## Connection details

| Setting | Value |
| --- | --- |
| Catalog URI | `https://krmlzwwelqvlfslwltol.storage.supabase.co/storage/v1/iceberg` |
| Warehouse | `question-images` |
| S3 endpoint | `https://krmlzwwelqvlfslwltol.storage.supabase.co/storage/v1/s3` |
| Region | `eu-west-1` |

The catalog token corresponds to the Supabase service role key; the S3 access
key / secret come from an S3 access key pair on the same project. Keep them in
`.env`, never in source.
