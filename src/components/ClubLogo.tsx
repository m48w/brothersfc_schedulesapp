import { useState } from "react";
import brothersFcLogo from "../logo/brothersfc.svg";

interface ClubLogoProps {
  className?: string;
  alt?: string;
  fallbackText?: string;
}

export function ClubLogo({
  className = "",
  alt = "Brothers FC logo",
  fallbackText = "FC"
}: ClubLogoProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedClassName = `club-logo ${className}`.trim();

  if (hasError) {
    return <div className={`${resolvedClassName} club-logo-fallback`}>{fallbackText}</div>;
  }

  return (
    <img
      className={resolvedClassName}
      src={brothersFcLogo}
      alt={alt}
      onError={() => setHasError(true)}
    />
  );
}
