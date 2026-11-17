import './styles.css'
import { syncToken } from './hybot'

// token info from hybot first, then the app (its modules read config.json at import time)
syncToken().finally(() => import('./boot'))
