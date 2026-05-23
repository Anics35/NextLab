function SplitPanelDivider({ type, onMouseDown }) {
  return <div className="w-2 cursor-col-resize bg-white/5 hover:bg-indigo-500/50" onMouseDown={(event) => onMouseDown(type, event)} />;
}

export default SplitPanelDivider;
