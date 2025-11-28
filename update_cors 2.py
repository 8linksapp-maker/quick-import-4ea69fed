import json
import os
from b2sdk.v2 import *

# --- CONFIGURAÇÃO ---
# O script agora lê as credenciais das variáveis de ambiente para mais segurança.
# Você não precisa editar este arquivo.
B2_KEY_ID = os.environ.get('B2_KEY_ID')
B2_APPLICATION_KEY = os.environ.get('B2_APPLICATION_KEY')
# --------------------

def main():
    if not B2_KEY_ID or not B2_APPLICATION_KEY:
        print("\nERRO: As credenciais da API não foram fornecidas.")
        print("Por favor, execute o script da seguinte forma, substituindo com suas chaves:")
        print("\nB2_KEY_ID='SEU_ID_AQUI' B2_APPLICATION_KEY='SUA_CHAVE_AQUI' python3 \"update_cors 2.py\"\n")
        return

    print("Initializing B2 API to fix video playback issue...")
    try:
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", B2_KEY_ID, B2_APPLICATION_KEY)
        print("B2 API Initialized and Authorized successfully.")
    except Exception as e:
        print(f"Failed to initialize or authorize B2 API: {e}")
        print("Please check if your API Key and Key ID are correct.")
        return

    correct_cors_rules = [
      {
        "corsRuleName": "allowUploadAndDownload",
        "allowedOrigins": [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:5173",
          "https://seoflix.com.br"
        ],
        "allowedOperations": [
          "b2_download_file_by_name",
          "s3_get",
          "s3_put"
        ],
        "allowedHeaders": ["*"],
        "exposeHeaders": ["x-bz-content-sha1"],
        "maxAgeSeconds": 3600
      }
    ]

    bucket_name = 'seoflix'
    try:
        print(f"Fetching bucket: {bucket_name}...")
        bucket = b2_api.get_bucket_by_name(bucket_name)
        print(f"Found bucket. Applying correct settings...")
        
        bucket.update(bucket_type='allPublic', cors_rules=correct_cors_rules)

        print("\n✅ Success! Bucket settings have been updated.")
        print(" - Bucket type set to: allPublic")
        print(f" - CORS rules applied to allow uploads/downloads from: {', '.join(correct_cors_rules[0]['allowedOrigins'])}")

        print("\nVerifying applied CORS rules...")
        current_rules = bucket.cors_rules
        print("Current rules on bucket:")
        print(json.dumps(current_rules, indent=2))
        
        print("\nVideo playback and upload should now be fixed. Please check your website.")
        
    except Exception as e:
        print(f"\nAn error occurred during the update: {e}")
        print("This could be due to the API key not having 'writeBuckets' permissions.")

if __name__ == '__main__':
    main()
