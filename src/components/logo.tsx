export default function Logo() {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="6" cy="6" r="6" fill="currentColor" />
      </svg>
      <span className="font-bold text-lg">llumina</span>
    </div>
  );
}
