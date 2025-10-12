"use client";

import { useRef, useState, useEffect } from "react";
import SocialCreditIcon from "./SocialCreditIcon";
import ProfileStat from "./ProfileStat";
import html2canvas from "html2canvas";

interface ShareStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  beetles: number;
  pokes: number;
  socialCredit: number;
  displayName: string;
  username: string;
  pfpUrl: string;
  cover?: string;
  beetlesRank?: number | null;
  pokesRank?: number | null;
  socialCreditRank?: number | null;
  totalUsers?: number | null;
}

export default function ShareStatsModal({
  isOpen,
  onClose,
  beetles,
  pokes,
  socialCredit,
  displayName,
  username,
  pfpUrl,
  cover,
  beetlesRank,
  pokesRank,
  socialCreditRank,
  totalUsers,
}: ShareStatsModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Stat card copied!");
  const [isGenerating, setIsGenerating] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    if (!cardRef.current || isGenerating) return;

    setIsGenerating(true);

    try {
      const clonedElement = cardRef.current.cloneNode(true) as HTMLElement;

      // Proxy all images for CORS
      await proxyImages(clonedElement);

      // Fix html2canvas rendering issues with flexbox alignment
      applyHtml2CanvasFixes(clonedElement);

      // Render to canvas
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      document.body.appendChild(clonedElement);

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clonedElement, {
        backgroundColor: "#131720",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      document.body.removeChild(clonedElement);

      // Convert canvas to blob immediately to maintain user gesture context
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png");
      });

      if (!blob) {
        setIsGenerating(false);
        return;
      }

      // iOS Safari requires ClipboardItem to be created synchronously in user gesture
      // Using Promise-based ClipboardItem for better iOS compatibility
      try {
        const clipboardItem = new ClipboardItem({
          "image/png": blob,
        });

        await navigator.clipboard.write([clipboardItem]);

        setToastMessage("Stat card copied!");
        setShowToast(true);
        toastTimeoutRef.current = setTimeout(() => {
          setShowToast(false);
          onClose();
        }, 1000);
      } catch (clipboardError) {
        console.error("Clipboard write failed:", clipboardError);

        // Fallback for iOS: attempt with Promise-based blob
        try {
          const clipboardItemDelayed = new ClipboardItem({
            "image/png": Promise.resolve(blob),
          });

          await navigator.clipboard.write([clipboardItemDelayed]);

          setToastMessage("Stat card copied!");
          setShowToast(true);
          toastTimeoutRef.current = setTimeout(() => {
            setShowToast(false);
            onClose();
          }, 1000);
        } catch (fallbackError) {
          console.error("Fallback clipboard failed:", fallbackError);
          setToastMessage("Copy failed. Please try again.");
          setShowToast(true);
          toastTimeoutRef.current = setTimeout(() => {
            setShowToast(false);
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
      setToastMessage("Failed to generate image.");
      setShowToast(true);
      toastTimeoutRef.current = setTimeout(() => {
        setShowToast(false);
      }, 2000);
    } finally {
      setIsGenerating(false);
    }
  };

  const proxyImages = async (element: HTMLElement) => {
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map((img) => {
      return new Promise<void>((resolve) => {
        if (img.src && !img.src.startsWith('data:')) {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.src)}`;
          const newImg = new Image();
          newImg.crossOrigin = 'anonymous';
          newImg.onload = () => {
            img.src = proxyUrl;
            resolve();
          };
          newImg.onerror = () => resolve();
          newImg.src = proxyUrl;
        } else {
          resolve();
        }
      });
    });

    // Preload and convert background images (including gifs) to data URLs
    const elementsWithBg = element.querySelectorAll('[style*="background-image"]');
    const bgPromises = Array.from(elementsWithBg).map((el) => {
      return new Promise<void>((resolve) => {
        const element = el as HTMLElement;
        const bgImage = element.style.backgroundImage;
        if (bgImage?.includes('url(')) {
          const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (urlMatch?.[1] && !urlMatch[1].startsWith('data:')) {
            const originalUrl = urlMatch[1];
            const proxyUrl = originalUrl.startsWith('/api/proxy-image')
              ? originalUrl
              : `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;

            // Load the image and convert to data URL to avoid async loading during canvas render
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  const dataUrl = canvas.toDataURL('image/png');
                  element.style.backgroundImage = `url(${dataUrl})`;
                }
                resolve();
              } catch (error) {
                console.error('Failed to convert background to data URL:', error);
                resolve();
              }
            };
            img.onerror = () => resolve();
            img.src = proxyUrl;
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      });
    });

    await Promise.all([...imagePromises, ...bgPromises]);
  };

  const applyHtml2CanvasFixes = (element: HTMLElement) => {
    // Use fixed width for consistent export across devices
    element.style.width = '480px';

    // Fix stat container alignment issues with html2canvas
    const statContainers = element.querySelectorAll('.inline-flex.flex-col');
    statContainers.forEach((container) => {
      const containerEl = container as HTMLElement;
      const label = containerEl.querySelector('span[class*="text-[10px]"]') as HTMLElement;
      if (label) label.style.marginBottom = '4px';

      const el = containerEl.querySelector('div[class*="flex items-center"]') as HTMLElement;
      if (!el) return;

      // Apply vertical offset to fix html2canvas flexbox rendering
      Array.from(el.children).forEach((child) => {
        const childEl = child as HTMLElement;
        const isFaIcon = childEl.tagName === 'I' && childEl.className.includes('fa-');
        const isSvg = childEl.tagName === 'svg';
        const isValueSpan = childEl.tagName === 'SPAN' && childEl.className.includes('text-white');
        const isRankSpan = childEl.tagName === 'SPAN' && !childEl.className.includes('text-white');

        if (isFaIcon || isValueSpan || isRankSpan) {
          childEl.style.transform = 'translateY(-7px)';
        } else if (isSvg) {
          childEl.style.transform = 'translateY(0px)';
        }
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#14161a] border border-[#23252a] rounded-md px-6 pt-3 pb-4 max-w-xl w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end mb-1">
          <button
            onClick={onClose}
            className="text-[#6e7787] hover:text-white transition-colors cursor-pointer"
          >
            <i className="fa-regular fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="rounded-lg flex items-center justify-center mb-4">
          <div
            ref={cardRef}
            className="relative border border-[#2d323b] rounded-lg p-8 w-full overflow-hidden"
          >
            {/* Cover Background */}
            {cover && (
              <>
                {/* Base Cover Image */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(https://remilia.com/covers/${cover}.png)`,
                    backgroundSize: "200%",
                    backgroundPosition: "30% 30%",
                    imageRendering: "pixelated",
                    filter: "contrast(1.1) saturate(0.9) brightness(1.1)",
                  }}
                />

                {/* Subtle RGB Dither Grid */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      repeating-linear-gradient(90deg, rgba(255,0,0,0.15) 0px, transparent 1px, rgba(0,255,0,0.15) 1px, transparent 2px, rgba(0,0,255,0.15) 2px, transparent 3px)
                    `,
                    backgroundSize: "3px 100%",
                    mixBlendMode: "overlay",
                  }}
                />

                {/* Light Scanlines */}
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, transparent 1px, transparent 2px)",
                    backgroundSize: "100% 2px",
                  }}
                />

                {/* Gradient Overlay for Readability */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(22, 26, 41, 0.6), rgba(25, 25, 30, 0.75))",
                  }}
                />
              </>
            )}
            {!cover && <div className="absolute inset-0 bg-[#181a1f]" />}

            {/* Header */}
            <div className="relative mb-6 flex items-center gap-4">
              <img
                src={pfpUrl}
                alt={displayName}
                className="w-24 h-24 rounded-lg flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/img/nopfp.png";
                }}
              />
              <div>
                <h2 className="text-3xl font-windsor-bold text-white mb-0">
                  {displayName}
                </h2>
                <p className="text-[#dddfe4] text-lg">~{username}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="relative [&_span[class*='text-white']]:!text-[#b8bdc7] [&_span[class*='text-[#6e7787]']]:!text-[#b8bdc7]">
              <div className="flex flex-row gap-3 justify-center items-center">
                <ProfileStat
                  label="Beetles"
                  value={beetles}
                  icon={<i className="fa-regular fa-bug text-soft-blue text-xs"></i>}
                  rank={beetlesRank}
                  totalUsers={totalUsers}
                />
                <ProfileStat
                  label="Pokes"
                  value={pokes}
                  icon={<i className="fa-regular fa-hand-point-up text-soft-blue text-xs"></i>}
                  rank={pokesRank}
                  totalUsers={totalUsers}
                />
                <ProfileStat
                  label="Social Credit"
                  value={socialCredit}
                  icon={<SocialCreditIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                  rank={socialCreditRank}
                  totalUsers={totalUsers}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleCopy}
          disabled={isGenerating}
          className="hidden md:flex w-full px-4 py-3 bg-primary-blue text-white rounded-md hover:bg-primary-dark-blue transition-colors shadow-[inset_0_-2px_0_0_#16368e] hover:shadow-[inset_0_-2px_0_0_#0d1b45] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed items-center justify-center"
        >
          {isGenerating ? (
            <>
              Generating...
              <i className="fa-regular fa-spinner-third fa-spin ml-2 text-sm"></i>
            </>
          ) : (
            <>
              Copy Image
              <i className="fa-regular fa-copy ml-2 text-sm"></i>
            </>
          )}
        </button>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-[#161a29] text-[#b8bdc7] text-sm rounded border border-divider shadow-lg animate-[slideUp_0.2s_ease-out]">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
