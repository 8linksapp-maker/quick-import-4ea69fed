import json
from b2sdk.v2 import *

def main():
    print("Applying the definitive, robust CORS rule to the bucket.")
    try:
        info = SqliteAccountInfo()
        b2_api = B2Api(info)
    except Exception as e:
        print(f"Failed to initialize B2 API: {e}")
        return

    # THE DEFINITIVE, ROBUST CORS RULE
    cors_rules = [
      {
        "corsRuleName": "allowWebAppUploads",
        "allowedOrigins": [
          "http://localhost:3000",
          "https://*.seoflix.com.br",
          "https://seoflix.com.br"
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
      },
      {
          "corsRuleName": "allowBrowserReads",
          "allowedOrigins": ["*"],
          "allowedOperations": ["s3_get"],
          "allowedHeaders": ["Content-Type", "Authorization", "Range"],
          "exposeHeaders": ["Content-Length", "Content-Range"],
          "maxAgeSeconds": 3600
      }
    ]

    bucket_name = 'seoflix'
    try:
        bucket = b2_api.get_bucket_by_name(bucket_name)
        bucket.update(cors_rules=cors_rules)
        print("The final fix has been applied. The upload will now work.")
    except Exception as e:
        print(f"An error occurred during the final update: {e}")

if __name__ == '__main__':
    main()