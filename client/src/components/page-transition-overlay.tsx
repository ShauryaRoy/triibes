import { useNavigation } from "@/hooks/use-navigation";

export function PageTransitionOverlay() {
  const { isNavigating } = useNavigation();

  return (
    <div
      className={`
        fixed inset-0 z-[9999] transition-opacity duration-300 pointer-events-none
        ${isNavigating ? "opacity-100" : "opacity-0"}
      `}
    >
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}
