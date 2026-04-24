import { useState, useEffect, useRef } from "react";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({
  size = 12,
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY,
}: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }
    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;
    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(
      Math.sqrt(deltaX ** 2 + deltaY ** 2),
      maxDistance,
    );
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: "transform 0.1s ease-out",
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY,
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }
    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;
    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(
      Math.sqrt(deltaX ** 2 + deltaY ** 2),
      maxDistance,
    );
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? "2px" : `${size}px`,
        backgroundColor: eyeColor,
        overflow: "hidden",
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: "transform 0.1s ease-out",
          }}
        />
      )}
    </div>
  );
};

export interface LoginIllustrationProps {
  passwordLength: number;
  showPassword: boolean;
  isTyping: boolean;
}

export const LoginIllustration = ({ passwordLength, showPassword, isTyping }: LoginIllustrationProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const scheduleBlink = (setter: (v: boolean) => void) => {
      const t = setTimeout(
        () => {
          setter(true);
          setTimeout(() => {
            setter(false);
            scheduleBlink(setter);
          }, 150);
        },
        Math.random() * 4000 + 3000,
      );
      return t;
    };
    const t1 = scheduleBlink(setIsPurpleBlinking);
    const t2 = scheduleBlink(setIsBlackBlinking);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  useEffect(() => {
    if (passwordLength > 0 && showPassword) {
      const t = setTimeout(
        () => {
          setIsPurplePeeking(true);
          setTimeout(() => setIsPurplePeeking(false), 800);
        },
        Math.random() * 3000 + 2000,
      );
      return () => clearTimeout(t);
    } else {
      setIsPurplePeeking(false);
    }
  }, [passwordLength, showPassword, isPurplePeeking]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));
    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  return (
    <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-12 text-primary-foreground">
      <div className="relative z-20">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="size-8 rounded-lg flex items-center justify-center">
            <img src="/logo.svg" alt="Logo-bps-bwi" className="size-8" />
          </div>
          <span>BPS Kabupaten Banyuwangi</span>
        </div>
      </div>

      <div className="relative z-20 flex items-end justify-center h-[500px]">
        <div
          className="relative"
          style={{ width: "550px", height: "400px" }}
        >
          {/* Purple character */}
          <div
            ref={purpleRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: "70px",
              width: "180px",
              height:
                isTyping || (passwordLength > 0 && !showPassword)
                  ? "440px"
                  : "400px",
              backgroundColor: "#68B92E",
              borderRadius: "10px 10px 0 0",
              zIndex: 1,
              transform:
                passwordLength > 0 && showPassword
                  ? `skewX(0deg)`
                  : isTyping || (passwordLength > 0 && !showPassword)
                    ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`
                    : `skewX(${purplePos.bodySkew || 0}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <div
              className="absolute flex gap-8 transition-all duration-700 ease-in-out"
              style={{
                left:
                  passwordLength > 0 && showPassword
                    ? `${20}px`
                    : isLookingAtEachOther
                      ? `${55}px`
                      : `${45 + purplePos.faceX}px`,
                top:
                  passwordLength > 0 && showPassword
                    ? `${35}px`
                    : isLookingAtEachOther
                      ? `${65}px`
                      : `${40 + purplePos.faceY}px`,
              }}
            >
              {[0, 1].map((i) => (
                <EyeBall
                  key={i}
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={
                    passwordLength > 0 && showPassword
                      ? isPurplePeeking
                        ? 4
                        : -4
                      : isLookingAtEachOther
                        ? 3
                        : undefined
                  }
                  forceLookY={
                    passwordLength > 0 && showPassword
                      ? isPurplePeeking
                        ? 5
                        : -4
                      : isLookingAtEachOther
                        ? 4
                        : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Black character */}
          <div
            ref={blackRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: "240px",
              width: "120px",
              height: "310px",
              backgroundColor: "#2D2D2D",
              borderRadius: "8px 8px 0 0",
              zIndex: 2,
              transform:
                passwordLength > 0 && showPassword
                  ? `skewX(0deg)`
                  : isLookingAtEachOther
                    ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                    : isTyping || (passwordLength > 0 && !showPassword)
                      ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                      : `skewX(${blackPos.bodySkew || 0}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <div
              className="absolute flex gap-6 transition-all duration-700 ease-in-out"
              style={{
                left:
                  passwordLength > 0 && showPassword
                    ? `${10}px`
                    : isLookingAtEachOther
                      ? `${32}px`
                      : `${26 + blackPos.faceX}px`,
                top:
                  passwordLength > 0 && showPassword
                    ? `${28}px`
                    : isLookingAtEachOther
                      ? `${12}px`
                      : `${32 + blackPos.faceY}px`,
              }}
            >
              {[0, 1].map((i) => (
                <EyeBall
                  key={i}
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={
                    passwordLength > 0 && showPassword
                      ? -4
                      : isLookingAtEachOther
                        ? 0
                        : undefined
                  }
                  forceLookY={
                    passwordLength > 0 && showPassword
                      ? -4
                      : isLookingAtEachOther
                        ? -4
                        : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Orange character */}
          <div
            ref={orangeRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: "0px",
              width: "240px",
              height: "200px",
              zIndex: 3,
              backgroundColor: "#EB891B",
              borderRadius: "120px 120px 0 0",
              transform:
                passwordLength > 0 && showPassword
                  ? `skewX(0deg)`
                  : `skewX(${orangePos.bodySkew || 0}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <div
              className="absolute flex gap-8 transition-all duration-200 ease-out"
              style={{
                left:
                  passwordLength > 0 && showPassword
                    ? `${50}px`
                    : `${82 + (orangePos.faceX || 0)}px`,
                top:
                  passwordLength > 0 && showPassword
                    ? `${85}px`
                    : `${90 + (orangePos.faceY || 0)}px`,
              }}
            >
              {[0, 1].map((i) => (
                <Pupil
                  key={i}
                  size={12}
                  maxDistance={5}
                  pupilColor="#2D2D2D"
                  forceLookX={
                    passwordLength > 0 && showPassword ? -5 : undefined
                  }
                  forceLookY={
                    passwordLength > 0 && showPassword ? -4 : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Yellow character */}
          <div
            ref={yellowRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: "310px",
              width: "140px",
              height: "230px",
              backgroundColor: "#E8D754",
              borderRadius: "70px 70px 0 0",
              zIndex: 4,
              transform:
                passwordLength > 0 && showPassword
                  ? `skewX(0deg)`
                  : `skewX(${yellowPos.bodySkew || 0}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <div
              className="absolute flex gap-6 transition-all duration-200 ease-out"
              style={{
                left:
                  passwordLength > 0 && showPassword
                    ? `${20}px`
                    : `${52 + (yellowPos.faceX || 0)}px`,
                top:
                  passwordLength > 0 && showPassword
                    ? `${35}px`
                    : `${40 + (yellowPos.faceY || 0)}px`,
              }}
            >
              {[0, 1].map((i) => (
                <Pupil
                  key={i}
                  size={12}
                  maxDistance={5}
                  pupilColor="#2D2D2D"
                  forceLookX={
                    passwordLength > 0 && showPassword ? -5 : undefined
                  }
                  forceLookY={
                    passwordLength > 0 && showPassword ? -4 : undefined
                  }
                />
              ))}
            </div>
            <div
              className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
              style={{
                left:
                  passwordLength > 0 && showPassword
                    ? `${10}px`
                    : `${40 + (yellowPos.faceX || 0)}px`,
                top:
                  passwordLength > 0 && showPassword
                    ? `${88}px`
                    : `${88 + (yellowPos.faceY || 0)}px`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-20 flex items-center gap-8 text-sm text-primary-foreground/60">
        <a
          href="/privacy-policy"
          className="hover:text-primary-foreground transition-colors"
        >
          Privacy Policy
        </a>
        <a
          href="/terms-of-service"
          className="hover:text-primary-foreground transition-colors"
        >
          Terms of Service
        </a>
        <a
          href="#"
          className="hover:text-primary-foreground transition-colors"
        >
          Contact
        </a>
      </div>

      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
      <div className="absolute top-1/4 right-1/4 size-64 bg-primary-foreground/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 size-96 bg-primary-foreground/5 rounded-full blur-3xl" />
    </div>
  );
};
