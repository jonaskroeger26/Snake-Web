"use client"

export function SolanaBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep dark base */}
      <div className="absolute inset-0 bg-[#050508]" />

      {/* Primary Solana purple orb - top left */}
      <div
        className="absolute -top-[10%] -left-[10%] w-[700px] h-[700px] rounded-full animate-float-slow"
        style={{
          background: "radial-gradient(circle, rgba(153,69,255,0.25) 0%, rgba(153,69,255,0.08) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Solana green orb - bottom right */}
      <div
        className="absolute -bottom-[15%] -right-[10%] w-[800px] h-[800px] rounded-full animate-float-fast"
        style={{
          background: "radial-gradient(circle, rgba(20,241,149,0.18) 0%, rgba(20,241,149,0.05) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* Center blend orb */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-float-medium"
        style={{
          background: "radial-gradient(circle, rgba(153,69,255,0.1) 0%, rgba(20,241,149,0.06) 50%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />

      {/* Small accent purple - top right */}
      <div
        className="absolute top-[15%] right-[15%] w-[300px] h-[300px] rounded-full animate-float-medium"
        style={{
          background: "radial-gradient(circle, rgba(153,69,255,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Small accent green - bottom left */}
      <div
        className="absolute bottom-[20%] left-[10%] w-[250px] h-[250px] rounded-full animate-float-slow"
        style={{
          background: "radial-gradient(circle, rgba(20,241,149,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(153,69,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(20,241,149,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Noise texture */}
      <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay" />

      {/* Dark vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,5,8,0.5)_100%)]" />
    </div>
  )
}
