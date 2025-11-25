import json
from b2sdk.v2 import *

def main():
    print("Initializing B2 API to apply final, robust CORS rules...")
    try:
        # SqliteAccountInfo automatically finds and loads the default account file
        info = SqliteAccountInfo()
        b2_api = B2Api(info)
    except Exception as e:
        print(f"Failed to initialize B2 API: {e}")
        print("Please ensure you have run 'b2 authorize-account' successfully.")
        return

    # FINAL ROBUST CORS RULE
    cors_rules = [
      {
        "corsRuleName": "allowWebAppUploads",
        "allowedOrigins": [
          "http://localhost:3000"
        ],
        "allowedHeaders": [
          "Authorization",
          "Content-Type",
          "x-amz-content-sha256",
          "x-amz-date",
          "x-amz-user-agent"
        ],
        "allowedOperations": [
          "s3_put"
        ],
        "exposeHeaders": [],
        "maxAgeSeconds": 3600
      }
    ]

    bucket_name = 'seoflix'
    try:
        print(f"Fetching bucket: {bucket_name}...")
        bucket = b2_api.get_bucket_by_name(bucket_name)
        print(f"Found bucket. Applying final CORS ruleset...")
        bucket.update(cors_rules=cors_rules)
        print("CORS rules updated successfully. The upload is now fixed.")
    except Exception as e:
        print(f"An error occurred during the final update: {e}")

if __name__ == '__main__':
    main()
