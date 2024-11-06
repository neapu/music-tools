import { BrowserWindow, dialog, ipcMain } from 'electron'
import Ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { loadMusicMetadata } from 'music-metadata'
import fs from 'fs'
import addon from '../../resources/addon.node'

export interface FileItem {
  name: string
  path: string
  state: FileState
  metadata: AudioMetadata
}

export interface EncoderConfig {
  outputDir: string,
  targetFormat: string
}

interface AudioMetadata {
  title: string
  artist: string
  album: string
  // year: string
  // track: string
  // genre: string
}

enum FileState {
  WAITING = 'waiting',
  CONVERTING = 'converting',
  DONE = 'done',
  ERROR = 'error'
}

class FileManager {
  private _stateChangedCallback: ((name: string, state: FileState) => void) | null = null

  setHandler() {
    ipcMain.handle('open-files', async () => {
      return await fileManager.openFiles()
    })

    ipcMain.handle('convert', async (_event, param) => {
      const { config, files } = JSON.parse(param)
      try {
        await fileManager.convertFormat(config, files)
        return true
      } catch (err) {
        console.error(err)
        return false
      }
    })

    ipcMain.handle('select-output-path', async () => {
      const ret = await dialog.showOpenDialog({
        properties: ['openDirectory']
      })
      console.log(ret)
      return ret
    })

    ipcMain.handle('modify-metadata', async (_event, param) => {
      const { file } = JSON.parse(param)
      // try {
      //   return await fileManager.modifyMetadata(file)
      // } catch (err) {
      //   console.error(err)
      //   return false
      // }
      console.log(file);
      return addon.setAudioMetadataTags(file.path, file.metadata);
    })

    ipcMain.handle('read-file-metadata', async (_event, param) => {
      // try {
      //   return await fileManager.readFileMetadata(param)
      // } catch (err) {
      //   console.error(err)
      //   return null
      // }'
      return addon.getAudioMetadataTags(param);
    })

    ipcMain.handle('reaname-file', async (_event, src, dst) => {
      try {
        fs.renameSync(src, dst);
        return true;
      } catch (err) {
        console.error(err);
        return false;
      }
    })

    ipcMain.on('test', (_event, param) => {
      console.log(param);
      // console.log(addon.test(param));
    });
  }

  setEvent(mainWindow: BrowserWindow) {
    this._stateChangedCallback = (name, state) => {
      mainWindow.webContents.send('state-changed', { name, state })
    }
  }

  async openFiles(): Promise<FileItem[] | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'ape'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled) {
      return null
    }

    const separator = process.platform === 'win32' ? '\\' : '/'
    const fileList: FileItem[] = []
    for (const filePath of result.filePaths) {
      const fileName = filePath.split(separator).pop() as string
      try {
        // const metadata = await this.readFileMetadata(filePath)!
        const metadata = addon.getAudioMetadataTags(filePath)!
        fileList.push({
          name: fileName,
          path: filePath,
          state: FileState.WAITING,
          metadata
        })
      } catch (err) {
        console.error(err)
      }
      
    }

    return fileList
  }

  async convertFile(file: FileItem, config: EncoderConfig, savePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Ffmpeg(file.path)
        .toFormat(config.targetFormat)
        .save(savePath)
        .on('end', () => {
          resolve()
        })
        .on('error', (err) => {
          reject(err)
        })
        .run()
    })
  }

  async convertFormat(config: EncoderConfig, files: FileItem[]): Promise<void> {
    for (const file of files) {
      const outputFileName = file.name.replace(/\.[^/.]+$/, `.${config.targetFormat}`)
      const savePath = path.join(config.outputDir, outputFileName)
      console.log(`Converting ${file.path} to ${savePath}`)
      this._stateChangedCallback?.(file.name, FileState.CONVERTING)
      try {
        await this.convertFile(file, config, savePath)
        this._stateChangedCallback?.(file.name, FileState.DONE)
      } catch (err) {
        console.error(err)
        this._stateChangedCallback?.(file.name, FileState.ERROR)
      }
    }
  }

  // modifyMetadata(file: FileItem): boolean {
  //   return addon.setAudioMetadata(file.path, file.metadata);
  // }

  async modifyMetadata(file: FileItem): Promise<boolean> {
    const tempFilePath = path.join(path.dirname(file.path), `temp_${path.basename(file.path)}`);
    let isResolved = false;
    return new Promise((resolve, reject) => {
      Ffmpeg(file.path)
          .save(tempFilePath)
          .on('end', () => {
            console.log('end');
            if (!isResolved) {
              isResolved = true;
              fs.unlinkSync(file.path);
              fs.renameSync(tempFilePath, file.path);
              resolve(true);
            }
          })
          .on('error', (err) => {
            reject(err)
          })
          .outputOption('-metadata', `title=${file.metadata.title}`)
          .outputOption('-metadata', `artist=${file.metadata.artist}`)
          .outputOption('-metadata', `album=${file.metadata.album}`)
          // .outputOption('-metadata', `track=${file.metadata.track}`)
          .run()
    })
  }

  trackToString(no: number|null, of: number|null): string {
    if (no === null) {
      return ''
    }
    if (of === null) {
      return no.toString()
    }
    return `${no}/${of}`
  }

  async readFileMetadata(filePath: string): Promise<AudioMetadata> {
    const mm = await loadMusicMetadata();
    const audioMetadata = await mm.parseFile(filePath);
    return {
        title: audioMetadata.common.title || '',
        artist: audioMetadata.common.artist || '',
        album: audioMetadata.common.album || '',
        // year: audioMetadata.common.year?.toString() || '',
        // track: this.trackToString(audioMetadata.common.track.no, audioMetadata.common.track.of),
        // genre: audioMetadata.common.genre?.at(0) || '',
    }
  }
    // readFileMetadata(filePath: string): AudioMetadata|null {
    //   const ret = addon.getAudioMetadata(filePath);
    //   console.log(ret);
    //   return ret;
    // }
}

export const fileManager = new FileManager()