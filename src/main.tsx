import { render } from 'preact';
import { BRAND } from './brand';
import { initFelt } from './core/felt';
import { startPointerTracking } from './core/pointer';
import { loadRecordings } from './core/recordings';
import { startTapMusic } from './core/tapMusic';
import { App } from './App';
import './styles.css';

document.title = `${BRAND.appName} · ${BRAND.appNameNe}`;
initFelt();
startPointerTracking();
startTapMusic(); // a soft note on empty felt, a different instrument on every screen
void loadRecordings(); // this device's own recordings, if any, override the bundled clips
render(<App />, document.getElementById('app')!);
