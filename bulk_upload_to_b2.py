import os
import sys
from pathlib import Path
from b2sdk.v2 import *

# --- CONFIGURAÇÃO ---
# O script lê as credenciais das variáveis de ambiente.
B2_KEY_ID = os.environ.get('B2_KEY_ID')
B2_APPLICATION_KEY = os.environ.get('B2_APPLICATION_KEY')
BUCKET_NAME = 'seoflix'  # Nome do seu bucket
# --------------------

# Lista de extensões de vídeo a serem procuradas. Adicione mais se necessário.
VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv']

class UploadProgressReporter(SimpleProgressListener):
    def __init__(self, file_path):
        super().__init__(f'Uploading {file_path}')
        self.file_path = file_path
        self.total_bytes = 0

    def set_total_bytes(self, total_bytes):
        self.total_bytes = total_bytes
        super().set_total_bytes(total_bytes)

    def update(self, bytes_completed):
        # Override to avoid printing on every small chunk
        # Let the base class handle the summary.
        pass
    
    def finish(self):
        # Override to avoid double printing
        pass

def main():
    # 1. Validar Entradas
    if not B2_KEY_ID or not B2_APPLICATION_KEY:
        print("\n❌ ERRO: As credenciais da API não foram fornecidas.")
        print("Por favor, execute o script da seguinte forma, substituindo com suas chaves:")
        print("\nB2_KEY_ID='SEU_ID' B2_APPLICATION_KEY='SUA_CHAVE' python3 bulk_upload_to_b2.py /caminho/para/sua/pasta/de/videos\n")
        return

    if len(sys.argv) < 2:
        print("\n❌ ERRO: O caminho para a pasta de vídeos não foi fornecido.")
        print("Uso: python3 bulk_upload_to_b2.py /caminho/para/sua/pasta/de/videos\n")
        return

    local_folder_path = Path(sys.argv[1])
    if not local_folder_path.is_dir():
        print(f"\n❌ ERRO: O caminho '{local_folder_path}' não é uma pasta válida.")
        return

    # 2. Inicializar a API do B2
    print("🚀 Inicializando a API do B2...")
    try:
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", B2_KEY_ID, B2_APPLICATION_KEY)
        bucket = b2_api.get_bucket_by_name(BUCKET_NAME)
        print(f"✅ API autorizada. Conectado ao bucket '{BUCKET_NAME}'.")
    except Exception as e:
        print(f"🔥 Falha ao inicializar a API ou encontrar o bucket: {e}")
        return

    # 3. Encontrar os arquivos de vídeo
    print(f"\n🔎 Procurando por vídeos na pasta '{local_folder_path}'...")
    files_to_upload = []
    for file_path in local_folder_path.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in VIDEO_EXTENSIONS:
            files_to_upload.append(file_path)

    if not files_to_upload:
        print("🤷 Nenhum arquivo de vídeo encontrado. Verifique a pasta e as extensões.")
        return

    print(f"✅ Encontrados {len(files_to_upload)} arquivos de vídeo para upload.\n")

    # 4. Fazer o upload de cada arquivo
    for index, local_file in enumerate(files_to_upload):
        # Define o nome do arquivo no B2, mantendo a estrutura de subpastas
        b2_file_name = str(local_file.relative_to(local_folder_path))
        file_size_mb = local_file.stat().st_size / (1024 * 1024)
        
        print(f"--- [Arquivo {index + 1}/{len(files_to_upload)}] ---")
        print(f"  📤 Iniciando upload de: {local_file.name} ({file_size_mb:.2f} MB)")
        print(f"     Destino no B2: {b2_file_name}")

        try:
            progress_listener = UploadProgressReporter(str(local_file))
            
            bucket.upload_local_file(
                local_file=str(local_file),
                file_name=b2_file_name,
                progress_listener=progress_listener,
            )
            print(f"  ✔️ Upload de '{local_file.name}' concluído com sucesso!")

        except Exception as e:
            print(f"  🔥 ERRO ao fazer upload de '{local_file.name}': {e}")
            print("     Pulando para o próximo arquivo...")
        
        print("-" * (20 + len(str(len(files_to_upload))) * 2))


    print("\n🎉 Todos os uploads foram concluídos!")

if __name__ == '__main__':
    try:
        import b2sdk
    except ImportError:
        print("\n❌ ERRO: A biblioteca 'b2sdk' não está instalada.")
        print("Por favor, instale-a com o comando: pip3 install b2sdk\n")
    else:
        main()
