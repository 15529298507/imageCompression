document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const originalImage = document.getElementById('originalImage');
    const compressedImage = document.getElementById('compressedImage');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const downloadBtn = document.getElementById('downloadBtn');

    let originalFile = null;
    let compressedFile = null;

    // 在文件顶部添加 ColorThief 库的引用
    const colorThief = new ColorThief();

    // 处理拖放上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#0071e3';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#86868b';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#86868b';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });

    // 处理点击上传
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
        }
    });

    // 处理质量滑块
    qualitySlider.addEventListener('input', (e) => {
        const quality = e.target.value;
        qualityValue.textContent = `${quality}%`;
        console.log('滑块值改变:', quality);

        if (originalFile) {
            // 添加防抖，避免频繁压缩
            clearTimeout(qualitySlider.timeout);
            qualitySlider.timeout = setTimeout(() => {
                console.log('开始压缩，质量值:', quality / 100);
                compressImage(originalFile, quality / 100);
            }, 300);
        }
    });

    // 图片压缩函数
    async function compressImage(file, quality) {
        try {
            console.log('压缩前文件大小:', formatFileSize(file.size));
            console.log('压缩质量设置:', quality);

            // 如果质量为100%，直接使用原图
            if (quality >= 1) {
                compressedFile = file;
                compressedImage.src = URL.createObjectURL(file);
                compressedSize.textContent = `${formatFileSize(file.size)} (原图)`;
                downloadBtn.disabled = false;
                return;
            }

            // 修改压缩率计算方式
            // 当质量为0%时，压缩率约为90%
            const maxCompressionRatio = 0.9;  // 最大压缩率（质量0%时）
            
            // 线性计算目标压缩率
            const targetRatio = maxCompressionRatio * (1 - quality);
            const targetSize = (file.size / (1024 * 1024)) * (1 - targetRatio);

            const options = {
                maxSizeMB: targetSize,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                quality: quality,
                alwaysKeepResolution: true
            };

            console.log('目标压缩率:', (targetRatio * 100).toFixed(1) + '%');
            console.log('压缩选项:', options);

            const compressedBlob = await imageCompression(file, options);
            compressedFile = new File([compressedBlob], file.name, {
                type: file.type
            });

            // 计算实际压缩率
            const actualRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
            
            // 更新预览和文件大小
            compressedImage.src = URL.createObjectURL(compressedFile);
            compressedSize.textContent = `${formatFileSize(compressedFile.size)} (压缩率: ${actualRatio}%)`;
            
            console.log('压缩质量:', quality * 100 + '%');
            console.log('实际压缩率:', actualRatio + '%');
            console.log('压缩后大小:', formatFileSize(compressedFile.size));

            downloadBtn.disabled = false;
        } catch (error) {
            console.error('压缩失败:', error);
            compressedSize.textContent = '压缩失败';
        }
    }

    // 处理图片上传
    function handleImageUpload(file) {
        console.log('上传的文件:', file);
        console.log('文件类型:', file.type);
        console.log('原始文件大小:', formatFileSize(file.size));

        originalFile = file;
        const tempImage = new Image();
        tempImage.src = URL.createObjectURL(file);
        
        // 图片加载完成后提取颜色
        tempImage.onload = () => {
            try {
                // 获取主色调
                const dominantColor = colorThief.getColor(tempImage);
                // 获取调色板
                const palette = colorThief.getPalette(tempImage, 5);
                
                // 创建渐变背景
                const gradient = createGradientFromColors(dominantColor, palette);
                document.body.style.background = gradient;
                
                // 继续处理图片预览和压缩
                originalImage.src = tempImage.src;
                originalSize.textContent = formatFileSize(file.size);
                
                const quality = qualitySlider.value;
                console.log('初始压缩质量:', quality);
                compressImage(file, quality / 100);
            } catch (error) {
                console.error('提取颜色失败:', error);
            }
        };
    }

    // 添加创建渐变的辅助函数
    function createGradientFromColors(mainColor, palette) {
        // 使主色调更柔和
        const softMainColor = `rgba(${mainColor[0]}, ${mainColor[1]}, ${mainColor[2]}, 0.15)`;
        const softPalette = palette.map(color => 
            `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.1)`
        );
        
        // 创建渐变
        return `linear-gradient(135deg, 
            ${softMainColor} 0%, 
            ${softPalette[0]} 25%, 
            ${softPalette[1]} 50%, 
            ${softPalette[2]} 75%, 
            ${softPalette[3]} 100%
        )`;
    }

    // 下载压缩后的图片
    downloadBtn.addEventListener('click', () => {
        if (compressedFile) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(compressedFile);
            link.download = `compressed_${compressedFile.name}`;
            link.click();
        }
    });

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 