import requests
import os
import time

# --- 配置信息 ---
# 基本 URL 模板，{} 将会被页码替换
BASE_URL_TEMPLATE = "https://file.icve.com.cn/file_gen_doc/663/40/A5F0A298AED66CEA78E34175500E69D6.pptx/{}.png"
# 提供的 token
TOKEN = "8d251129-ec35-46d0-b9c0-e82314e324c5"
# 下载的图片范围
START_PAGE = 1
END_PAGE = 13
# 保存图片的目录名
DOWNLOAD_DIR = "downloaded_images8"

# --- 创建下载目录 ---
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)
    print(f"Created directory: {DOWNLOAD_DIR}")
else:
    print(f"Directory already exists: {DOWNLOAD_DIR}")

# --- 下载图片 ---
print(f"Starting download of images from page {START_PAGE} to {END_PAGE}...")

for i in range(START_PAGE, END_PAGE + 1):
    # 构建完整的图片 URL，包括 token 参数
    image_url = BASE_URL_TEMPLATE.format(i)
    full_url = f"{image_url}?token={TOKEN}"

    # 构建本地保存的文件名
    filename = os.path.join(DOWNLOAD_DIR, f"{i}.png")

    print(f"Downloading {full_url} -> {filename}...")

    try:
        # 发送 HTTP GET 请求
        response = requests.get(full_url, stream=True) # Use stream=True for large files

        # 检查响应状态码
        if response.status_code == 200:
            # 写入文件
            with open(filename, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192): # Iterate over content in chunks
                    f.write(chunk)
            print(f"Successfully downloaded {filename}")
        else:
            print(f"Failed to download page {i}. Status code: {response.status_code}")

    except requests.exceptions.RequestException as e:
        print(f"An error occurred while downloading page {i}: {e}")

    # 可以添加一个短暂的延迟，防止请求过快
    # time.sleep(0.1) # 延迟0.1秒

print("Download process finished.")