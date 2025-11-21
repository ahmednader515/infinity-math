"use client";

import { useEffect, useRef } from "react";
import "plyr/dist/plyr.css";

interface PlyrVideoPlayerProps {
  videoUrl?: string;
  youtubeVideoId?: string;
  videoType?: "UPLOAD" | "YOUTUBE";
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export const PlyrVideoPlayer = ({
  videoUrl,
  youtubeVideoId,
  videoType = "UPLOAD",
  className,
  onEnded,
  onTimeUpdate
}: PlyrVideoPlayerProps) => {
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const youtubeEmbedRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const YOUTUBE_QUALITY_LABEL_MAP: Record<
    string,
    { value: number; label: string }
  > = {
    highres: { value: 4320, label: "4320p" },
    hd2880: { value: 2880, label: "2880p" },
    hd2160: { value: 2160, label: "2160p" },
    hd1440: { value: 1440, label: "1440p" },
    hd1080: { value: 1080, label: "1080p" },
    hd720: { value: 720, label: "720p" },
    large: { value: 480, label: "480p" },
    medium: { value: 360, label: "360p" },
    small: { value: 240, label: "240p" },
    tiny: { value: 144, label: "144p" },
    auto: { value: -1, label: "Auto" }
  };

  const QUALITY_VALUE_TO_YOUTUBE: Record<number, string> = Object.entries(
    YOUTUBE_QUALITY_LABEL_MAP
  ).reduce<Record<number, string>>((acc, [key, info]) => {
    if (info.value >= 0) {
      acc[info.value] = key;
    }
    return acc;
  }, {});

  // Initialize Plyr on mount/update and destroy on unmount
  useEffect(() => {
    let isCancelled = false;

    async function setupPlayer() {
      const targetEl =
        videoType === "YOUTUBE" ? youtubeEmbedRef.current : html5VideoRef.current;
      if (!targetEl) return;

      // Dynamically import Plyr to be SSR-safe
      const plyrModule: any = await import("plyr");
      const Plyr: any = plyrModule.default ?? plyrModule;

      if (isCancelled) return;

      // Destroy any previous instance
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      const player = new Plyr(targetEl, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen"
        ],
        settings: ["speed", "quality", "loop"],
        quality: {
          default: 720,
          options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240, 144],
          forced: true
        },
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        youtube: {
          rel: 0,
          modestbranding: 1,
          controls: 0,
          iv_load_policy: 3,
          disablekb: 1,
          playsinline: 1
        },
        ratio: "16:9"
      });

      playerRef.current = player;

      const getYoutubeEmbedInstance = () => {
        return player?.media?.plyr?.embed ?? null;
      };

      const disableYoutubeOverlayInteraction = () => {
        const container: HTMLElement | null =
          player?.elements?.container ?? null;
        const iframe = container?.querySelector("iframe");
        if (iframe) {
          iframe.style.pointerEvents = "none";
          iframe.setAttribute("tabindex", "-1");
        }
      };

      const updateYoutubeQualityMenu = () => {
        try {
          const embed = getYoutubeEmbedInstance();
          if (
            !embed ||
            typeof embed.getAvailableQualityLevels !== "function" ||
            !player?.elements?.settings
          ) {
            return;
          }

          const availableLevels = embed.getAvailableQualityLevels?.() ?? [];
          if (!availableLevels.length) return;

          const settingsElements = player.elements.settings;
          const panelElement = settingsElements?.panels?.quality ?? null;
          const menu =
            panelElement?.querySelector<HTMLDivElement>("[role='menu']") ?? null;
          const button = settingsElements?.buttons?.quality ?? null;
          if (!menu || !panelElement || !button) return;

          menu.innerHTML = "";

          const qualities = availableLevels
            .map((level: string) => {
              const mapped = YOUTUBE_QUALITY_LABEL_MAP[level];
              if (mapped) {
                return { ...mapped, youtubeQuality: level };
              }
              return null;
            })
            .filter(Boolean) as Array<{
            value: number;
            label: string;
            youtubeQuality: string;
          }>;

          const hasAutoOption = availableLevels.includes("auto");
          const orderedQualities = qualities
            .filter((quality) => quality.value >= 0)
            .sort((a, b) => b.value - a.value);

          if (hasAutoOption) {
            const autoInfo = YOUTUBE_QUALITY_LABEL_MAP["auto"];
            menu.appendChild(
              createQualityMenuItem({
                value: autoInfo.value,
                label: autoInfo.label,
                youtubeQuality: "auto",
                embed,
                player,
                menu
              })
            );
          }

          orderedQualities.forEach((quality) => {
            menu.appendChild(
              createQualityMenuItem({
                ...quality,
                embed,
                player,
                menu
              })
            );
          });

          if (menu.childElementCount === 0) {
            button.hidden = true;
            panelElement.hidden = true;
            return;
          }

          const labelElement =
            button.querySelector<HTMLElement>(".plyr__menu__value");
          if (labelElement) {
            const current =
              typeof embed.getPlaybackQuality === "function"
                ? embed.getPlaybackQuality()
                : null;
            const currentLabel = current
              ? YOUTUBE_QUALITY_LABEL_MAP[current]?.label ?? ""
              : "";
            labelElement.innerHTML = currentLabel || (hasAutoOption ? "Auto" : "");
          }

          button.hidden = false;
          button.disabled = false;
          button.removeAttribute("hidden");
          panelElement.hidden = false;
          panelElement.removeAttribute("hidden");
          settingsElements.menu?.removeAttribute("hidden");

          const numericOptions = orderedQualities.map((quality) => quality.value);
          player.config.quality.options = numericOptions;
          if (!player.options) {
            player.options = {};
          }
          player.options.quality = numericOptions;
        } catch (error) {
          console.error("Failed to update YouTube quality menu:", error);
        }
      };

      const createQualityMenuItem = ({
        value,
        label,
        youtubeQuality,
        embed,
        player,
        menu
      }: {
        value: number;
        label: string;
        youtubeQuality: string;
        embed: any;
        player: any;
        menu: Element;
      }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "plyr__control";
        button.setAttribute("role", "menuitemradio");
        button.setAttribute("data-plyr", "quality");
        button.setAttribute("aria-checked", "false");
        button.dataset.plyr = "quality";
        button.dataset.value = value.toString();
        button.innerHTML = `<span>${label}</span>`;

        const setActive = (isActive: boolean) => {
          button.setAttribute("aria-checked", `${isActive}`);
          if (isActive) {
            button.classList.add("plyr__menu__control--checked");
          } else {
            button.classList.remove("plyr__menu__control--checked");
          }
        };

        button.addEventListener("click", () => {
          try {
            if (
              embed &&
              typeof embed.setPlaybackQuality === "function" &&
              youtubeQuality !== "auto"
            ) {
              embed.setPlaybackQuality(youtubeQuality);
            }

            if (player) {
              if (value >= 0) {
                player.quality = value;
              } else {
                player.quality = null;
              }
            }

            menu
              .querySelectorAll("[role='menuitemradio']")
              .forEach((item) => {
                if (item instanceof HTMLElement) {
                  item.setAttribute("aria-checked", "false");
                  item.classList.remove("plyr__menu__control--checked");
                }
              });

            setActive(true);
            const labelElement =
              player?.elements?.settings?.buttons?.quality?.querySelector(
                ".plyr__menu__value"
              );
            if (labelElement) {
              labelElement.innerHTML = label;
            }
            player?.elements?.settings?.menus?.quality?.classList.remove(
              "plyr__menu__container--hidden"
            );
          } catch (error) {
            console.error("Failed to change YouTube playback quality:", error);
          }
        });

        const currentYoutubeQuality =
          typeof embed?.getPlaybackQuality === "function"
            ? embed.getPlaybackQuality()
            : null;

        if (currentYoutubeQuality === youtubeQuality) {
          setActive(true);
        }

        return button;
      };

      if (videoType === "YOUTUBE") {
        player.on("ready", () => {
          disableYoutubeOverlayInteraction();
          updateYoutubeQualityMenu();
        });
        disableYoutubeOverlayInteraction();
        updateYoutubeQualityMenu();

        player.on("loadeddata", updateYoutubeQualityMenu);
        player.on("qualitychange", () => {
          const embed = getYoutubeEmbedInstance();
          if (!embed) return;

          const desiredQuality =
            QUALITY_VALUE_TO_YOUTUBE[player.quality] ?? null;

          if (
            desiredQuality &&
            typeof embed.setPlaybackQuality === "function"
          ) {
            embed.setPlaybackQuality(desiredQuality);
          }
        });
      }

      if (onEnded) player.on("ended", onEnded);
      if (onTimeUpdate)
        player.on("timeupdate", () => onTimeUpdate(player.currentTime || 0));
    }

    setupPlayer();

    return () => {
      isCancelled = true;
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
      }
      playerRef.current = null;
    };
  }, [videoUrl, youtubeVideoId, videoType, onEnded, onTimeUpdate]);

  const hasVideo = (videoType === "YOUTUBE" && !!youtubeVideoId) || !!videoUrl;

  if (!hasVideo) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-muted-foreground">لا يوجد فيديو</div>
      </div>
    );
  }

  return (
    <div className={`aspect-video ${className || ""}`}>
      {videoType === "YOUTUBE" && youtubeVideoId ? (
        <div
          ref={youtubeEmbedRef}
          data-plyr-provider="youtube"
          data-plyr-embed-id={youtubeVideoId}
          className="w-full h-full"
        />
      ) : (
        <video ref={html5VideoRef} className="w-full h-full" playsInline crossOrigin="anonymous">
          {videoUrl ? <source src={videoUrl} type="video/mp4" /> : null}
        </video>
      )}
    </div>
  );
};