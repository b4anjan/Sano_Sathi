import { render } from 'preact';
import { BRAND } from './brand';
import { initFelt } from './core/felt';
import { startPointerTracking } from './core/pointer';
import { App } from './App';
import './styles.css';

document.title = BRAND.appName;
initFelt();
startPointerTracking();
render(<App />, document.getElementById('app')!);
