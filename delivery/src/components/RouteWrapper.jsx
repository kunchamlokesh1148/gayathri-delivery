export default function RouteWrapper({ children }) {
  return (
    <div className="w-full max-w-lg md:max-w-5xl lg:max-w-6xl mx-auto px-4 py-6 mb-24 animate-slide-up">
      {children}
    </div>
  );
}
