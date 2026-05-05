import { LeftPanel } from './components/LeftPanel/LeftPanel';
import { CenterPanel } from './components/CenterPanel/CenterPanel';
import { RightPanel } from './components/RightPanel/RightPanel';

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Left panel — 200px */}
      <div className="w-[200px] min-w-[160px] max-w-[240px] flex-shrink-0 h-full">
        <LeftPanel />
      </div>

      {/* Center panel — fills remaining space */}
      <div className="flex-1 min-w-0 h-full">
        <CenterPanel />
      </div>

      {/* Right panel — 280px */}
      <div className="w-[280px] min-w-[220px] max-w-[320px] flex-shrink-0 h-full">
        <RightPanel />
      </div>
    </div>
  );
}
