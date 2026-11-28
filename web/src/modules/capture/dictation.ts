/**
 * Dictation through the Web Speech API, typed down to the two members this product calls. Chromium
 * and Safari ship it behind their own prefix, Firefox does not ship it at all, so everything here
 * answers "is there a recogniser" first and the screen falls back to typing when there is not.
 */
type Result = { isFinal: boolean; 0: { transcript: string } }

type ResultEvent = { resultIndex: number; results: ArrayLike<Result | undefined> }

type Recogniser = EventTarget & {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
}

type RecogniserCtor = new () => Recogniser

type SpeechScope = {
  SpeechRecognition?: RecogniserCtor
  webkitSpeechRecognition?: RecogniserCtor
}

const ctorOf = (): RecogniserCtor | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }

  const scope = window as unknown as SpeechScope

  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

export const canDictate = (): boolean => ctorOf() !== undefined

export type Dictation = { stop: () => void }

/**
 * One session: the recogniser streams interim words while the person talks and a final word when
 * it settles, then ends itself on silence. `onText` gets both, so the screen can show the sentence
 * forming; `onEnd` fires whichever way it stopped, including the microphone being denied.
 */
export function dictate(handlers: {
  onText: (text: string, final: boolean) => void
  onEnd: () => void
}): Dictation | undefined {
  const Ctor = ctorOf()

  if (Ctor === undefined) {
    return undefined
  }

  const recogniser = new Ctor()
  let ended = false

  const end = () => {
    if (!ended) {
      ended = true
      handlers.onEnd()
    }
  }

  recogniser.continuous = true
  recogniser.interimResults = true
  recogniser.lang = navigator.language === '' ? 'en-US' : navigator.language
  recogniser.addEventListener('result', (event) => {
    const { resultIndex, results } = event as unknown as ResultEvent

    for (let index = resultIndex; index < results.length; index += 1) {
      const result = results[index]

      if (result !== undefined) {
        handlers.onText(result[0].transcript, result.isFinal)
      }
    }
  })
  recogniser.addEventListener('error', end)
  recogniser.addEventListener('end', end)
  recogniser.start()

  return {
    stop: () => {
      recogniser.stop()
    },
  }
}
