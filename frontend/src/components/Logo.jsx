import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function Logo({ size = "md" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };
  return (
    <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#4f6ef7] to-[#00c4cc] flex items-center justify-center group-hover:scale-110 transition-transform">
        <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#4f6ef7] to-[#00c4cc] blur-md opacity-50 -z-10" />
      </div>
      <span className={`font-heading font-extrabold ${sizes[size]} tracking-tight text-white`}>
        Study<span className="gradient-text">AI</span>
      </span>
    </Link>
  );
}
