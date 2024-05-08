import React, {useContext, useState, useSyncExternalStore} from 'react'
import {AppState} from 'react-native'
import {BskyAgent} from '@atproto-labs/api'
import {useFocusEffect, useIsFocused} from '@react-navigation/native'

import {Convo, ConvoParams, ConvoState} from '#/state/messages/convo'
import {CurrentConvoIdProvider} from '#/state/messages/current-convo-id'
import {MessagesEventBusProvider} from '#/state/messages/events'
import {useAgent} from '#/state/session'
import {useDmServiceUrlStorage} from '#/screens/Messages/Temp/useDmServiceUrlStorage'

const ChatContext = React.createContext<ConvoState | null>(null)

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return ctx
}

export function ChatProvider({
  children,
  convoId,
}: Pick<ConvoParams, 'convoId'> & {children: React.ReactNode}) {
  const isScreenFocused = useIsFocused()
  const {serviceUrl} = useDmServiceUrlStorage()
  const {getAgent} = useAgent()
  const [convo] = useState(
    () =>
      new Convo({
        convoId,
        agent: new BskyAgent({
          service: serviceUrl,
        }),
        __tempFromUserDid: getAgent().session?.did!,
      }),
  )
  const service = useSyncExternalStore(convo.subscribe, convo.getSnapshot)

  useFocusEffect(
    React.useCallback(() => {
      convo.resume()

      return () => {
        convo.background()
      }
    }, [convo]),
  )

  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (isScreenFocused) {
        if (nextAppState === 'active') {
          convo.resume()
        } else {
          convo.background()
        }
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      sub.remove()
    }
  }, [convo, isScreenFocused])

  return <ChatContext.Provider value={service}>{children}</ChatContext.Provider>
}

export function MessagesProvider({children}: {children: React.ReactNode}) {
  return (
    <CurrentConvoIdProvider>
      <MessagesEventBusProvider>{children}</MessagesEventBusProvider>
    </CurrentConvoIdProvider>
  )
}