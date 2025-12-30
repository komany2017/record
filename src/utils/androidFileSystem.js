import { Filesystem } from '@capacitor/filesystem';

/**
 * 获取安卓手机目录
 * @returns {Promise<Object>} - 包含各种目录路径的对象
 */
export async function getAndroidDirectories() {
  try {
    const directories = {};

    if (Filesystem) {
      try {
        const documents = await Filesystem.getUri({
          directory: 'DOCUMENTS',
          path: ''
        });
        directories.documents = documents.uri;
      } catch (error) {
        console.log('无法获取文档目录:', error);
      }

      try {
        const downloads = await Filesystem.getUri({
          directory: 'DOWNLOADS',
          path: ''
        });
        directories.downloads = downloads.uri;
      } catch (error) {
        console.log('无法获取下载目录:', error);
      }

      try {
        const external = await Filesystem.getUri({
          directory: 'EXTERNAL',
          path: ''
        });
        directories.external = external.uri;
      } catch (error) {
        console.log('无法获取外部存储目录:', error);
      }

      try {
        const data = await Filesystem.getUri({
          directory: 'DATA',
          path: ''
        });
        directories.data = data.uri;
      } catch (error) {
        console.log('无法获取数据目录:', error);
      }

      try {
        const cache = await Filesystem.getUri({
          directory: 'CACHE',
          path: ''
        });
        directories.cache = cache.uri;
      } catch (error) {
        console.log('无法获取缓存目录:', error);
      }
    }

    return {
      success: true,
      directories
    };
  } catch (error) {
    console.error('获取安卓目录时发生错误:', error);
    return {
      success: false,
      error: error.message,
      directories: null
    };
  }
}

/**
 * 读取指定目录下的文件列表
 * @param {string} directory - 目录类型 (DOCUMENTS, DOWNLOADS, EXTERNAL, DATA, CACHE)
 * @param {string} path - 子路径 (可选)
 * @returns {Promise<Object>} - 文件列表
 */
export async function readDirectoryFiles(directory, path = '') {
  try {
    const result = await Filesystem.readdir({
      directory,
      path
    });

    return {
      success: true,
      files: result.files
    };
  } catch (error) {
    console.error('读取目录文件时发生错误:', error);
    return {
      success: false,
      error: error.message,
      files: []
    };
  }
}

/**
 * 在安卓设备上创建目录
 * @param {string} directory - 目录类型
 * @param {string} path - 要创建的路径
 * @returns {Promise<Object>} - 创建结果
 */
export async function createDirectory(directory, path) {
  try {
    await Filesystem.mkdir({
      directory,
      path,
      recursive: true
    });

    return {
      success: true,
      message: `目录 ${path} 创建成功`
    };
  } catch (error) {
    console.error('创建目录时发生错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 检查文件是否存在
 * @param {string} directory - 目录类型
 * @param {string} path - 文件路径
 * @returns {Promise<boolean>} - 文件是否存在
 */
export async function checkFileExists(directory, path) {
  try {
    await Filesystem.stat({
      directory,
      path
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 获取文件信息
 * @param {string} directory - 目录类型
 * @param {string} path - 文件路径
 * @returns {Promise<Object>} - 文件信息
 */
export async function getFileInfo(directory, path) {
  try {
    const stat = await Filesystem.stat({
      directory,
      path
    });

    return {
      success: true,
      type: stat.type,
      size: stat.size,
      ctime: stat.ctime,
      mtime: stat.mtime,
      uri: stat.uri
    };
  } catch (error) {
    console.error('获取文件信息时发生错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
}