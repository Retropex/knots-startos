import { VersionGraph } from '@start9labs/start-sdk'
import { v_28_3_5 as core28_3 } from 'bitcoin-core-startos/startos/versions/v28.3.5'
import { v_29_3_5 as core29_3 } from 'bitcoin-core-startos/startos/versions/v29.3.5'
import { v_30_2_5 as core30_2 } from 'bitcoin-core-startos/startos/versions/v30.2.5'
import { v29_3_4 } from './v29.3_4'

export const versionGraph = VersionGraph.of({
  current: v29_3_4,
  other: [core30_2, core29_3, core28_3],
})
