from PIL import Image
import os

paths = [
    '/Users/sanjaydakshinamoorthy/.gemini/antigravity/brain/1804099a-0898-4744-b6f0-5d76b3859cd1/uploaded_image_1765561499413.png',
    '/Users/sanjaydakshinamoorthy/.gemini/antigravity/brain/1804099a-0898-4744-b6f0-5d76b3859cd1/uploaded_image_1765554058733.png',
    '/Users/sanjaydakshinamoorthy/.gemini/antigravity/brain/1804099a-0898-4744-b6f0-5d76b3859cd1/uploaded_image_1765555113108.png'
]

for path in paths:
    if os.path.exists(path):
        try:
            with Image.open(path) as img:
                print(f"{os.path.basename(path)}: {img.size} (Width x Height)")
        except Exception as e:
            print(f"Error opening {os.path.basename(path)}: {e}")
    else:
        print(f"File not found: {path}")
