"use client"

export function SolanaBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep dark base */}
      <div className="absolute inset-0 bg-[#050508]" />

      {/* Soft Solana orbs - reduced intensity for calmer first impression */}
      <div
        className="absolute -top-[10%] -left-[10%] w-[700px] h-[700px] rounded-full animate-float-slow"
        style={{
          background: "radial-gradient(circle, rgba(153,69,255,0.12) 0%, rgba(153,69,255,0.04) 50%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <div
        className="absolute -bottom-[15%] -right-[10%] w-[800px] h-[800px] rounded-full animate-float-fast"
        style={{
          background: "radial-gradient(circle, rgba(20,241,149,0.08) 0%, rgba(20,241,149,0.02) 50%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-float-medium"
        style={{
          background: "radial-gradient(circle, rgba(153,69,255,0.05) 0%, rgba(20,241,149,0.03) 50%, transparent 70%)",
          filter: "blur(140px)",
        }}
      />

      {/* Dark vignette - keeps focus on center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,5,8,0.4)_100%)]" />
    </div>
  )
}
