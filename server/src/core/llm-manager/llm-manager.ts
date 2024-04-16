import fs from 'node:fs'

import type { Llama, LlamaModel } from 'node-llama-cpp'

import {
  LLM_MINIMUM_FREE_RAM,
  LLM_NAME_WITH_VERSION,
  LLM_PATH
} from '@/constants'
import { LogHelper } from '@/helpers/log-helper'
import { SystemHelper } from '@/helpers/system-helper'

type LLMManagerLlama = Llama | null
type LLMManagerModel = LlamaModel | null

// Set to 0 to use the maximum threads supported by the current machine hardware
export const LLM_THREADS = 4

/**
 * node-llama-cpp beta 3 docs:
 * @see https://github.com/withcatai/node-llama-cpp/pull/105
 */
export default class LLMManager {
  private static instance: LLMManager
  private _isLLMEnabled = false
  private _llama: LLMManagerLlama = null
  private _model: LLMManagerModel = null

  get llama(): Llama {
    return this._llama as Llama
  }

  get model(): LlamaModel {
    return this._model as LlamaModel
  }

  get isLLMEnabled(): boolean {
    return this._isLLMEnabled
  }

  constructor() {
    if (!LLMManager.instance) {
      LogHelper.title('LLM Manager')
      LogHelper.success('New instance')

      LLMManager.instance = this
    }
  }

  public async loadLLM(): Promise<void> {
    LogHelper.title('LLM Manager')

    const freeRAMInGB = SystemHelper.getFreeRAM()

    /**
     * In case the LLM is not set up and
     * the current free RAM is enough to load the LLM
     */
    if (!fs.existsSync(LLM_PATH) && LLM_MINIMUM_FREE_RAM <= freeRAMInGB) {
      LogHelper.warning(
        'The LLM is not set up yet whereas the current free RAM is enough to enable it. You can run the following command to set it up: "npm install"'
      )

      return
    }
    /**
     * In case the LLM is set up and
     * the current free RAM is not enough to load the LLM
     */
    if (fs.existsSync(LLM_PATH) && LLM_MINIMUM_FREE_RAM > freeRAMInGB) {
      LogHelper.warning(
        'There is not enough free RAM to load the LLM. So the LLM will not be enabled.'
      )

      return
    }

    try {
      const { LlamaLogLevel, getLlama } = await Function(
        'return import("node-llama-cpp")'
      )()

      this._llama = await getLlama({
        logLevel: LlamaLogLevel.debug
      })
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      this._model = await this._llama.loadModel({
        modelPath: LLM_PATH
      })
      this._isLLMEnabled = true

      LogHelper.success(`${LLM_NAME_WITH_VERSION} LLM has been loaded`)
    } catch (e) {
      LogHelper.error(`LLM Manager failed to load: ${e}`)
    }
  }
}
