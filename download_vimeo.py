import subprocess
import sys
import os

# --- LISTA DE VÍDEOS PARA BAIXAR ---
# Cole as URLs do Vimeo aqui, uma por linha, dentro das aspas triplas.
VIDEO_URLS = """
https://vimeo.com/1036753643?share=copy&fl=sv&fe=ci
https://vimeo.com/1038974603?share=copy&fl=sv&fe=ci
https://vimeo.com/1041571886?share=copy&fl=sv&fe=ci
https://vimeo.com/1042477541?share=copy&fl=sv&fe=ci
https://vimeo.com/1046484442?share=copy&fl=sv&fe=ci
https://vimeo.com/1048143168?share=copy&fl=sv&fe=ci
https://vimeo.com/1050227630?share=copy&fl=sv&fe=ci
https://vimeo.com/1053233723?share=copy&fl=sv&fe=ci
https://vimeo.com/1055290255?share=copy&fl=sv&fe=ci
https://vimeo.com/1057606514?share=copy&fl=sv&fe=ci
https://vimeo.com/1059087862?share=copy&fl=sv&fe=ci
https://vimeo.com/1061338806?share=copy&fl=sv&fe=ci
https://vimeo.com/1066388984?share=copy&fl=sv&fe=ci
"""
# ------------------------------------

def check_yt_dlp():
    """Verifica se o yt-dlp está instalado e acessível."""
    try:
        subprocess.run(['yt-dlp', '--version'], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def main():
    if not check_yt_dlp():
        print("\n❌ ERRO: A ferramenta 'yt-dlp' não foi encontrada.")
        print("   Por favor, instale-a com um dos seguintes comandos:")
        print("   pip3 install yt-dlp")
        print("   OU")
        print("   brew install yt-dlp  (se você usa Homebrew no macOS)")
        print()
        return

    print("✅ Ferramenta 'yt-dlp' encontrada.")

    # Limpa a lista de URLs, remove linhas vazias e os parâmetros de 'share'
    urls = [url.strip().split('?')[0] for url in VIDEO_URLS.strip().split('\n') if url.strip()]
    
    total_videos = len(urls)
    print(f"🔎 Encontrados {total_videos} vídeos para baixar.\n")

    # Cria uma pasta 'downloads' para salvar os vídeos, se não existir
    download_folder = 'vimeo_downloads'
    os.makedirs(download_folder, exist_ok=True)
    print(f"ℹ️  Os vídeos serão salvos na pasta: '{download_folder}'\n")

    for i, url in enumerate(urls):
        print(f"--- [Vídeo {i + 1}/{total_videos}] ---")
        print(f"▶️  Iniciando download de: {url}")
        
        try:
            # O formato do nome do arquivo será "01.ext", "02.ext", etc.
            command = [
                'yt-dlp',
                '-o', f'{download_folder}/{i + 1:02d}.%(ext)s',
                '--cookies-from-browser', 'chrome',
                '--concurrent-fragments', '8',
                '--no-overwrites', # Não baixa novamente se o arquivo já existir
                '--no-playlist',
                '--progress',
                url
            ]
            
            # Executa o comando yt-dlp
            subprocess.run(command, check=True)
            print(f"✔️ Download de '{url}' concluído com sucesso.\n")

        except subprocess.CalledProcessError as e:
            print(f"🔥 ERRO ao baixar '{url}': O processo retornou um erro.", file=sys.stderr)
            print(f"   Verifique se o vídeo é 'Não Listado' ou 'Público' e a URL está correta.", file=sys.stderr)
            print(f"   Pulando para o próximo vídeo...\n", file=sys.stderr)
        except Exception as e:
            print(f"🔥 UM ERRO INESPERADO OCORREU ao baixar '{url}': {e}", file=sys.stderr)
            print(f"   Pulando para o próximo vídeo...\n", file=sys.stderr)

    print("🎉 Processo finalizado! Todos os vídeos foram baixados.")

if __name__ == '__main__':
    main()
