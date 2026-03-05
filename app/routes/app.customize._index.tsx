import { useState, useCallback } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRouteError, isRouteErrorResponse } from "react-router";
import { authenticate } from "../shopify.server";

import styles from "../components/customize.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { product: null as string | null };
};

/* Config types */
type DefaultMode = "portrait" | "fullbody";
type Position = "inline" | "floating-bottom" | "floating-right";
type PopupType = "sheet" | "modal";
type TypographySize = "s" | "m" | "l";
type Shadow = "none" | "soft" | "medium";
type PreviewView = "product-card" | "model-popup" | "closet";
type PreviewState = "normal" | "loading" | "error" | "closet-empty" | "success-added";

const defaultConfig = {
  experience: {
    enableBoth: true,
    defaultMode: "portrait" as DefaultMode,
  },
  productCard: {
    showTryOn: true,
    showCloset: true,
    tryOnLabel: "Try On",
    closetLabel: "+ Closet",
    position: "inline" as Position,
    buttonHeight: 36,
    cornerRadius: 8,
  },
  popup: {
    type: "sheet" as PopupType,
    showProductName: true,
    showCloseButton: true,
    primaryCta: "Add to Closet" as const,
    secondaryCta: "Add to Cart" as const,
  },
  closet: {
    showToast: true,
    autoOpenDrawer: true,
    badgeCount: true,
    createLookCta: true,
  },
  theme: {
    primaryColor: "#1f1f1f",
    secondaryColor: "#d0d0d0",
    textColor: "#1f1f1f",
    typographySize: "m" as TypographySize,
    shadow: "soft" as Shadow,
  },
};

import {
  EXAMPLE_MODEL,
  EXAMPLE_ITEMS,
  closetItems,
  ALL_CLOSET_ITEMS,
  type SavedLook,
  SAVE_LOOK_TAGS,
} from "../data/exampleItems";

function Toggle({
  on,
  label,
  onChange,
}: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
        onClick={() => onChange(!on)}
      >
        <span className={styles.toggleKnob} />
      </button>
    </div>
  );
}

function Accordion({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.accordion} id={id}>
      <button
        type="button"
        id={`${id}-header`}
        className={styles.accordionHeader}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-content`}
      >
        <span>{title}</span>
        <svg
          className={`${styles.accordionChevron} ${open ? styles.accordionChevronOpen : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        id={`${id}-content`}
        className={`${styles.accordionContent} ${!open ? styles.accordionContentCollapsed : ""}`}
        role="region"
        aria-labelledby={`${id}-header`}
      >
        <div className={styles.accordionBody}>{children}</div>
      </div>
    </section>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.data?.message ?? error.statusText
    : error instanceof Error
      ? error.message
      : "Something went wrong";
  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2 style={{ color: "#d72c0d" }}>Customize page error</h2>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{String(message)}</pre>
    </div>
  );
}

export default function CustomizePage() {
  useLoaderData<typeof loader>();
  const [config, setConfig] = useState(defaultConfig);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewZoom, setPreviewZoom] = useState(100);
  const [view, setView] = useState<PreviewView>("product-card");
  const [previewState, setPreviewState] = useState<PreviewState>("normal");
  const [popupMode, setPopupMode] = useState<"portrait" | "fullbody">("portrait");
  const [popupLayer, setPopupLayer] = useState<"top" | "bottom">("top");
  const [popupPortraitItemId, setPopupPortraitItemId] = useState<string | null>(null);
  const [popupTopItemId, setPopupTopItemId] = useState<string | null>(null);
  const [popupBottomItemId, setPopupBottomItemId] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [closetTab, setClosetTab] = useState<"all" | "top" | "bottom" | "saved">("all");
  const [closetSearch, setClosetSearch] = useState("");
  const [closetFilters, setClosetFilters] = useState<Record<string, boolean>>({
    top: false,
    bottom: false,
    favorite: false,
    inStock: false,
  });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [saveLookModalOpen, setSaveLookModalOpen] = useState(false);
  const [saveLookPayload, setSaveLookPayload] = useState<{ topId: string; bottomId: string } | null>(null);
  const [saveLookDraft, setSaveLookDraft] = useState({
    name: "",
    tags: [] as string[],
    visibility: "private" as "private" | "public",
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    experience: true,
    productCard: true,
    popup: true,
    closet: true,
    theme: true,
  });

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const update = useCallback(<K extends keyof typeof config>(key: K, patch: Partial<typeof config[K]>) => {
    setConfig((c) => ({ ...c, [key]: { ...c[key], ...patch } }));
  }, []);

  const saveDraft = () => {
    setDraftSavedAt("Just now");
    setTimeout(() => setDraftSavedAt(null), 3000);
  };

  const publish = () => {
    // Placeholder: would persist and notify
  };

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const toggleClosetFilter = useCallback((key: string) => {
    setClosetFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const openSaveLookModal = useCallback((payload: { topId: string; bottomId: string }) => {
    setSaveLookPayload(payload);
    setSaveLookDraft({ name: "", tags: [], visibility: "private" });
    setSaveLookModalOpen(true);
  }, []);

  const submitSaveLook = useCallback(() => {
    if (!saveLookPayload) return;
    const look: SavedLook = {
      id: `look_${Date.now()}`,
      name: saveLookDraft.name || "My Look",
      tags: saveLookDraft.tags,
      visibility: saveLookDraft.visibility,
      topId: saveLookPayload.topId,
      bottomId: saveLookPayload.bottomId,
    };
    setSavedLooks((prev) => [...prev, look]);
    setSaveLookModalOpen(false);
    setSaveLookPayload(null);
  }, [saveLookPayload, saveLookDraft]);

  const deleteSavedLook = useCallback((id: string) => {
    setSavedLooks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return (
    <div className={styles.page}>
      {/* Sticky header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>Customize Experience</h1>
          <p className={styles.headerSubtitle}>
            Model Popup on Product Card + Add to Closet
          </p>
        </div>
        <div className={styles.headerRight}>
          {draftSavedAt && (
            <span className={styles.statusChip}>Draft saved {draftSavedAt}</span>
          )}
          <button type="button" className={styles.btnSecondary} onClick={saveDraft}>
            Save Draft
          </button>
          <button type="button" className={styles.btnPrimary} onClick={publish}>
            Publish
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {/* Left panel — 30% */}
        <aside className={styles.leftPanel}>
          <p className={styles.leftPanelTitle}>Styling</p>
          <Accordion
            id="accordion-experience"
            title="A — Experience Mode"
            open={openSections.experience}
            onToggle={() => toggleSection("experience")}
          >
            <Toggle
                on={config.experience.enableBoth}
                label="Enable both modes"
                onChange={(v) => update("experience", { enableBoth: v })}
              />
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Default mode</span>
                <select
                  className={styles.select}
                  value={config.experience.defaultMode}
                  onChange={(e) =>
                    update("experience", {
                      defaultMode: e.target.value as DefaultMode,
                    })
                  }
                >
                  <option value="portrait">Portrait</option>
                  <option value="fullbody">Full-body</option>
                </select>
              </div>
            <p className={styles.note}>
              System remembers user&apos;s last selected mode.
            </p>
          </Accordion>

          <Accordion
            id="accordion-productCard"
            title="B — Product Card Trigger"
            open={openSections.productCard}
            onToggle={() => toggleSection("productCard")}
          >
            <Toggle
                on={config.productCard.showTryOn}
                label="Show Try-On button"
                onChange={(v) => update("productCard", { showTryOn: v })}
              />
              <Toggle
                on={config.productCard.showCloset}
                label="Show +Closet button"
                onChange={(v) => update("productCard", { showCloset: v })}
              />
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Try-On label</span>
                <input
                  className={styles.input}
                  value={config.productCard.tryOnLabel}
                  onChange={(e) =>
                    update("productCard", { tryOnLabel: e.target.value })
                  }
                />
              </div>
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Closet label</span>
                <input
                  className={styles.input}
                  value={config.productCard.closetLabel}
                  onChange={(e) =>
                    update("productCard", { closetLabel: e.target.value })
                  }
                />
              </div>
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Position</span>
                <select
                  className={styles.select}
                  value={config.productCard.position}
                  onChange={(e) =>
                    update("productCard", {
                      position: e.target.value as Position,
                    })
                  }
                >
                  <option value="inline">Inline (under price)</option>
                  <option value="floating-bottom">Floating bottom</option>
                  <option value="floating-right">Floating right</option>
                </select>
              </div>
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Button height (px)</span>
                <div className={styles.sliderRow}>
                  <input
                    type="range"
                    className={styles.slider}
                    min={24}
                    max={48}
                    value={config.productCard.buttonHeight}
                    onChange={(e) =>
                      update("productCard", {
                        buttonHeight: Number(e.target.value),
                      })
                    }
                  />
                  <span className={styles.sliderValue}>
                    {config.productCard.buttonHeight}
                  </span>
                </div>
              </div>
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Corner radius (px)</span>
                <div className={styles.sliderRow}>
                  <input
                    type="range"
                    className={styles.slider}
                    min={0}
                    max={24}
                    value={config.productCard.cornerRadius}
                    onChange={(e) =>
                      update("productCard", {
                        cornerRadius: Number(e.target.value),
                      })
                    }
                  />
                  <span className={styles.sliderValue}>
                    {config.productCard.cornerRadius}
                  </span>
                </div>
              </div>
          </Accordion>

          <Accordion
            id="accordion-popup"
            title="C — Popup Style"
            open={openSections.popup}
            onToggle={() => toggleSection("popup")}
          >
            <div className={styles.labelRow}>
                <span className={styles.labelText}>Popup type</span>
                <select
                  className={styles.select}
                  value={config.popup.type}
                  onChange={(e) =>
                    update("popup", { type: e.target.value as PopupType })
                  }
                >
                  <option value="sheet">Bottom sheet (mobile)</option>
                  <option value="modal">Center modal (desktop)</option>
                </select>
              </div>
              <Toggle
                on={config.popup.showProductName}
                label="Show product name"
                onChange={(v) => update("popup", { showProductName: v })}
              />
              <Toggle
                on={config.popup.showCloseButton}
                label="Show close button"
                onChange={(v) => update("popup", { showCloseButton: v })}
              />
            <p className={styles.note}>
              Primary CTA: Add to Closet · Secondary: Add to Cart
            </p>
          </Accordion>

          <Accordion
            id="accordion-closet"
            title="D — Closet Behavior"
            open={openSections.closet}
            onToggle={() => toggleSection("closet")}
          >
            <Toggle
                on={config.closet.showToast}
                label="Show toast after Add to Closet"
                onChange={(v) => update("closet", { showToast: v })}
              />
              <Toggle
                on={config.closet.autoOpenDrawer}
                label="Auto-open closet drawer"
                onChange={(v) => update("closet", { autoOpenDrawer: v })}
              />
              <Toggle
                on={config.closet.badgeCount}
                label="Closet badge count on icon"
                onChange={(v) => update("closet", { badgeCount: v })}
              />
              <Toggle
                on={config.closet.createLookCta}
                label="Create Look CTA visibility"
                onChange={(v) => update("closet", { createLookCta: v })}
              />
          </Accordion>

          <Accordion
            id="accordion-theme"
            title="E — Theme"
            open={openSections.theme}
            onToggle={() => toggleSection("theme")}
          >
            <div className={styles.labelRow}>
                <span className={styles.labelText}>Primary button</span>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={config.theme.primaryColor}
                    onChange={(e) =>
                      update("theme", { primaryColor: e.target.value })
                    }
                  />
                  <span className={styles.colorHex}>{config.theme.primaryColor}</span>
                </div>
              </div>
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Secondary button</span>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={config.theme.secondaryColor}
                    onChange={(e) =>
                      update("theme", { secondaryColor: e.target.value })
                    }
                  />
                  <span className={styles.colorHex}>{config.theme.secondaryColor}</span>
                </div>
              </div>
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Text color</span>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={config.theme.textColor}
                    onChange={(e) =>
                      update("theme", { textColor: e.target.value })
                    }
                  />
                  <span className={styles.colorHex}>{config.theme.textColor}</span>
                </div>
              </div>
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Typography size</span>
                <select
                  className={styles.select}
                  value={config.theme.typographySize}
                  onChange={(e) =>
                    update("theme", {
                      typographySize: e.target.value as TypographySize,
                    })
                  }
                >
                  <option value="s">S</option>
                  <option value="m">M</option>
                  <option value="l">L</option>
                </select>
              </div>
              <div className={styles.labelRow}>
                <span className={styles.labelText}>Shadow intensity</span>
                <select
                  className={styles.select}
                  value={config.theme.shadow}
                  onChange={(e) =>
                    update("theme", { shadow: e.target.value as Shadow })
                  }
                >
                  <option value="none">None</option>
                  <option value="soft">Soft</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
          </Accordion>
        </aside>

        {/* Right panel — 70%: Live Preview */}
        <div className={styles.rightPanel}>
          <div className={styles.previewTopBar}>
            <div className={styles.previewSwitchers}>
              <span className={styles.previewLabel}>Device:</span>
              <div className={styles.pillGroup}>
                <button
                  type="button"
                  className={`${styles.pill} ${device === "desktop" ? styles.pillActive : ""}`}
                  onClick={() => setDevice("desktop")}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  className={`${styles.pill} ${device === "mobile" ? styles.pillActive : ""}`}
                  onClick={() => setDevice("mobile")}
                >
                  Mobile
                </button>
              </div>
              <span className={styles.previewLabel}>View:</span>
              <div className={styles.pillGroup}>
                <button
                  type="button"
                  className={`${styles.pill} ${view === "product-card" ? styles.pillActive : ""}`}
                  onClick={() => setView("product-card")}
                >
                  Product Card
                </button>
                <button
                  type="button"
                  className={`${styles.pill} ${view === "model-popup" ? styles.pillActive : ""}`}
                  onClick={() => setView("model-popup")}
                >
                  Model Popup
                </button>
                <button
                  type="button"
                  className={`${styles.pill} ${view === "closet" ? styles.pillActive : ""}`}
                  onClick={() => setView("closet")}
                >
                  Closet
                </button>
              </div>
            </div>
            <div className={styles.previewSwitchers}>
              <span className={styles.previewLabel}>Preview state:</span>
              <select
                className={styles.previewStateSelect}
                value={previewState}
                onChange={(e) =>
                  setPreviewState(e.target.value as PreviewState)
                }
              >
                <option value="normal">Normal</option>
                <option value="loading">Loading try-on</option>
                <option value="error">Error: image not compatible</option>
                <option value="closet-empty">Closet empty</option>
                <option value="success-added">Success: added</option>
              </select>
              <span className={styles.previewLabel}>Live preview updates instantly</span>
              <span className={styles.previewLabel}>Zoom:</span>
              <div className={styles.zoomControls}>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  onClick={() => setPreviewZoom((z) => Math.max(50, z - 25))}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className={styles.zoomValue}>{previewZoom}%</span>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  onClick={() => setPreviewZoom((z) => Math.min(150, z + 25))}
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className={styles.previewCanvas}>
            {/* Viewport mock first; zoom wrapper scales the whole viewport */}
            <div
              className={styles.previewCanvasZoomWrap}
              style={{ transform: `scale(${previewZoom / 100})` }}
            >
              <div
                className={
                  device === "mobile"
                    ? styles.viewportMockMobile
                    : styles.viewportMockDesktop
                }
              >
              <div className={styles.viewportMockInner}>
                <PreviewContent
                  view={view}
                  previewState={previewState}
                  config={config}
                  popupMode={popupMode}
                  setPopupMode={setPopupMode}
                  popupLayer={popupLayer}
                  setPopupLayer={setPopupLayer}
                  popupPortraitItemId={popupPortraitItemId}
                  setPopupPortraitItemId={setPopupPortraitItemId}
                  popupTopItemId={popupTopItemId}
                  setPopupTopItemId={setPopupTopItemId}
                  popupBottomItemId={popupBottomItemId}
                  setPopupBottomItemId={setPopupBottomItemId}
                  isMobile={device === "mobile"}
                  onOpenSaveLook={openSaveLookModal}
                  savedLooks={savedLooks}
                  onDeleteSavedLook={deleteSavedLook}
                  closetTab={closetTab}
                  setClosetTab={setClosetTab}
                  closetSearch={closetSearch}
                  setClosetSearch={setClosetSearch}
                  closetFilters={closetFilters}
                  toggleClosetFilter={toggleClosetFilter}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  setPopupTopItemIdFromCloset={setPopupTopItemId}
                  setPopupBottomItemIdFromCloset={setPopupBottomItemId}
                />
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Look modal */}
      {saveLookModalOpen && saveLookPayload && (
        <div className={styles.modalBackdrop} onClick={() => setSaveLookModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Save Look</h3>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Look name</label>
              <input
                type="text"
                className={styles.modalInput}
                placeholder="e.g. Casual Friday"
                value={saveLookDraft.name}
                onChange={(e) => setSaveLookDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Tags</label>
              <div className={styles.modalTagRow}>
                {SAVE_LOOK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles.chip} ${saveLookDraft.tags.includes(tag) ? styles.chipSelected : ""}`}
                    onClick={() =>
                      setSaveLookDraft((d) => ({
                        ...d,
                        tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
                      }))
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Visibility</label>
              <div className={styles.pillGroup}>
                <button
                  type="button"
                  className={`${styles.pill} ${saveLookDraft.visibility === "private" ? styles.pillActive : ""}`}
                  onClick={() => setSaveLookDraft((d) => ({ ...d, visibility: "private" }))}
                >
                  Private
                </button>
                <button
                  type="button"
                  className={`${styles.pill} ${saveLookDraft.visibility === "public" ? styles.pillActive : ""}`}
                  onClick={() => setSaveLookDraft((d) => ({ ...d, visibility: "public" }))}
                >
                  Public
                </button>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setSaveLookModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className={styles.btnPrimary} onClick={submitSaveLook}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewContent({
  view,
  previewState,
  config,
  popupMode,
  setPopupMode,
  popupLayer,
  setPopupLayer,
  popupPortraitItemId,
  setPopupPortraitItemId,
  popupTopItemId,
  setPopupTopItemId,
  popupBottomItemId,
  setPopupBottomItemId,
  isMobile,
  onOpenSaveLook,
  savedLooks,
  onDeleteSavedLook,
  closetTab,
  setClosetTab,
  closetSearch,
  setClosetSearch,
  closetFilters,
  toggleClosetFilter,
  favorites,
  toggleFavorite,
  setPopupTopItemIdFromCloset,
  setPopupBottomItemIdFromCloset,
}: {
  view: PreviewView;
  previewState: PreviewState;
  config: typeof defaultConfig;
  popupMode: "portrait" | "fullbody";
  setPopupMode: (m: "portrait" | "fullbody") => void;
  popupLayer: "top" | "bottom";
  setPopupLayer: (l: "top" | "bottom") => void;
  popupPortraitItemId: string | null;
  setPopupPortraitItemId: (id: string | null) => void;
  popupTopItemId: string | null;
  setPopupTopItemId: (id: string | null) => void;
  popupBottomItemId: string | null;
  setPopupBottomItemId: (id: string | null) => void;
  isMobile: boolean;
  onOpenSaveLook: (payload: { topId: string; bottomId: string }) => void;
  savedLooks: SavedLook[];
  onDeleteSavedLook: (id: string) => void;
  closetTab: "all" | "top" | "bottom" | "saved";
  setClosetTab: (t: "all" | "top" | "bottom" | "saved") => void;
  closetSearch: string;
  setClosetSearch: (v: string) => void;
  closetFilters: Record<string, boolean>;
  toggleClosetFilter: (key: string) => void;
  favorites: Set<string>;
  toggleFavorite: (itemId: string) => void;
  setPopupTopItemIdFromCloset: (id: string | null) => void;
  setPopupBottomItemIdFromCloset: (id: string | null) => void;
}) {
  const btnStyle = {
    height: config.productCard.buttonHeight,
    borderRadius: config.productCard.cornerRadius,
    backgroundColor: config.theme.primaryColor,
    color: "#fff",
    border: "none",
    padding: "0 12px",
    fontSize: 13,
    cursor: "pointer" as const,
  };
  const btnSecStyle = {
    ...btnStyle,
    backgroundColor: config.theme.secondaryColor,
    color: config.theme.textColor,
  };

  if (view === "product-card") {
    if (previewState === "loading") {
      return (
        <div className={styles.previewStateMessage}>
          Loading try-on…
        </div>
      );
    }
    if (previewState === "error") {
      return (
        <div className={`${styles.previewStateMessage} ${styles.previewStateError}`}>
          Image not compatible with try-on.
        </div>
      );
    }
    return (
      <div className={styles.cardPreview}>
        <div className={styles.cardImage} />
        <div className={styles.cardInfo}>
          {config.popup.showProductName && (
            <h3 className={styles.cardTitle}>Sample Product</h3>
          )}
          <p className={styles.cardPrice}>$49.00</p>
          <div className={styles.cardButtons}>
            {config.productCard.showTryOn && (
              <button type="button" className={styles.cardBtn} style={btnStyle}>
                {config.productCard.tryOnLabel}
              </button>
            )}
            {config.productCard.showCloset && (
              <button type="button" className={styles.cardBtn} style={btnSecStyle}>
                {config.productCard.closetLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "model-popup") {
    if (previewState === "loading") {
      return (
        <div className={styles.previewStateMessage}>
          Loading model…
        </div>
      );
    }
    if (previewState === "error") {
      return (
        <div className={`${styles.previewStateMessage} ${styles.previewStateError}`}>
          Image not compatible with try-on.
        </div>
      );
    }
    if (previewState === "success-added") {
      return (
        <div className={`${styles.previewStateMessage} ${styles.previewStateSuccess}`}>
          Added to Closet ✓
        </div>
      );
    }
    const isPortrait = popupMode === "portrait";
    const portraitItem = popupPortraitItemId
      ? EXAMPLE_ITEMS.faceAccessories.find((i) => i.id === popupPortraitItemId)
      : null;
    const topItem = popupTopItemId
      ? EXAMPLE_ITEMS.top.find((i) => i.id === popupTopItemId)
      : null;
    const bottomItem = popupBottomItemId
      ? EXAMPLE_ITEMS.bottom.find((i) => i.id === popupBottomItemId)
      : null;
    const listItems = isPortrait
      ? EXAMPLE_ITEMS.faceAccessories
      : popupLayer === "top"
        ? EXAMPLE_ITEMS.top
        : EXAMPLE_ITEMS.bottom;
    const activeItemId = isPortrait
      ? popupPortraitItemId
      : popupLayer === "top"
        ? popupTopItemId
        : popupBottomItemId;
    const setActiveItemId = isPortrait
      ? setPopupPortraitItemId
      : popupLayer === "top"
        ? setPopupTopItemId
        : setPopupBottomItemId;

    return (
      <div className={styles.popupPreview}>
        <div className={styles.popupHeader}>
          {config.popup.showProductName && (
            <h3 className={styles.popupTitle}>Sample Product</h3>
          )}
          {config.popup.showCloseButton && (
            <button type="button" className={styles.popupClose} aria-label="Close">
              ×
            </button>
          )}
        </div>
        {config.experience.enableBoth && (
          <div className={styles.popupTabsRow}>
            <div className={styles.popupTabs}>
              <button
                type="button"
                className={`${styles.popupTab} ${popupMode === "portrait" ? styles.popupTabActive : ""}`}
                onClick={() => setPopupMode("portrait")}
              >
                Portrait
              </button>
              <button
                type="button"
                className={`${styles.popupTab} ${popupMode === "fullbody" ? styles.popupTabActive : ""}`}
                onClick={() => setPopupMode("fullbody")}
              >
                Full-body
              </button>
            </div>
            {!isPortrait && (
              <div className={styles.popupLayerSwitch}>
                <span className={styles.popupLayerLabel}>Layer:</span>
                <div className={styles.pillGroup}>
                  <button
                    type="button"
                    className={`${styles.pill} ${popupLayer === "top" ? styles.pillActive : ""}`}
                    onClick={() => setPopupLayer("top")}
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    className={`${styles.pill} ${popupLayer === "bottom" ? styles.pillActive : ""}`}
                    onClick={() => setPopupLayer("bottom")}
                  >
                    Bottom
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <div className={styles.popupCanvasArea}>
          {isPortrait ? (
            <div className={styles.popupCanvasSingle}>
              <div className={styles.popupCanvasBase} title={EXAMPLE_MODEL.portraitBase} />
              {portraitItem && (
                <span className={styles.popupCanvasLabel}>
                  {portraitItem.name} on portrait
                </span>
              )}
              {!portraitItem && (
                <span className={styles.popupCanvasLabel}>Select face accessory</span>
              )}
            </div>
          ) : (
            <div className={styles.popupFullbodyStack}>
              {topItem && (
                <div className={styles.popupCanvasLayer}>
                  <span className={styles.popupCanvasLayerTitle}>Top</span>
                  <div className={styles.popupCanvasLayerImgWrap}>
                    <img src={topItem.image} alt="" className={styles.popupCanvasLayerImg} />
                  </div>
                  <span className={styles.popupCanvasLabel}>{topItem.name}</span>
                </div>
              )}
              {bottomItem && (
                <div className={styles.popupCanvasLayer}>
                  <span className={styles.popupCanvasLayerTitle}>Bottom</span>
                  <div className={styles.popupCanvasLayerImgWrap}>
                    <img src={bottomItem.image} alt="" className={styles.popupCanvasLayerImg} />
                  </div>
                  <span className={styles.popupCanvasLabel}>{bottomItem.name}</span>
                </div>
              )}
              {!topItem && !bottomItem && (
                <div className={styles.popupCanvasLayer}>
                  <span className={styles.popupCanvasLabel}>Select 1 top and 1 bottom</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className={styles.popupItemList}>
          {listItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.popupItemCard} ${activeItemId === item.id ? styles.popupItemCardActive : ""}`}
              onClick={() => setActiveItemId(item.id)}
            >
              <div className={styles.popupItemThumb}>
                <img src={item.image} alt="" className={styles.popupItemThumbImg} />
              </div>
              <span className={styles.popupItemName}>{item.name}</span>
            </button>
          ))}
        </div>
        <div className={styles.popupCtas}>
          {!isPortrait && topItem && bottomItem && (
            <button
              type="button"
              className={styles.cardBtn}
              style={btnSecStyle}
              onClick={() => onOpenSaveLook({ topId: popupTopItemId!, bottomId: popupBottomItemId! })}
            >
              Save Look
            </button>
          )}
          <button type="button" className={styles.cardBtn} style={btnStyle}>
            {config.popup.primaryCta}
          </button>
          <button type="button" className={styles.cardBtn} style={btnSecStyle}>
            {config.popup.secondaryCta}
          </button>
        </div>
      </div>
    );
  }

  // Closet view
  if (previewState === "closet-empty") {
    return (
      <div className={styles.previewStateMessage}>
        Closet is empty. Add items from product pages.
      </div>
    );
  }

  const searchLower = closetSearch.trim().toLowerCase();
  const filteredItems = (() => {
    let list =
      closetTab === "top"
        ? ALL_CLOSET_ITEMS.filter((i) => i.category === "top")
        : closetTab === "bottom"
          ? ALL_CLOSET_ITEMS.filter((i) => i.category === "bottom")
          : ALL_CLOSET_ITEMS;
    if (closetFilters.top) list = list.filter((i) => i.category === "top");
    if (closetFilters.bottom) list = list.filter((i) => i.category === "bottom");
    if (closetFilters.favorite) list = list.filter((i) => favorites.has(i.id));
    if (searchLower) list = list.filter((i) => i.name.toLowerCase().includes(searchLower));
    return list;
  })();

  const closetTopItem = popupTopItemId ? EXAMPLE_ITEMS.top.find((t) => t.id === popupTopItemId) : null;
  const closetBottomItem = popupBottomItemId ? EXAMPLE_ITEMS.bottom.find((b) => b.id === popupBottomItemId) : null;
  const hasFullLook = Boolean(closetTopItem && closetBottomItem);

  return (
    <div className={styles.closetPreview}>
      <div className={styles.closetTabs}>
        {(["all", "top", "bottom", "saved"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.closetTab} ${closetTab === tab ? styles.closetTabActive : ""}`}
            onClick={() => setClosetTab(tab)}
          >
            {tab === "all" ? "All" : tab === "top" ? "Top" : tab === "bottom" ? "Bottom" : "Saved Looks"}
          </button>
        ))}
      </div>

      {closetTab === "saved" ? (
        <div className={styles.savedLookList}>
          {savedLooks.length === 0 ? (
            <p className={styles.previewStateMessage}>No saved looks yet. Combine a top + bottom in Model Popup and click Save Look.</p>
          ) : (
            savedLooks.map((look) => {
              const topItem = EXAMPLE_ITEMS.top.find((t) => t.id === look.topId);
              const bottomItem = EXAMPLE_ITEMS.bottom.find((b) => b.id === look.bottomId);
              return (
                <div key={look.id} className={styles.savedLookCard}>
                  <div className={styles.savedLookPreview}>
                    {topItem && <img src={topItem.image} alt="" className={styles.savedLookPreviewImg} />}
                    {bottomItem && <img src={bottomItem.image} alt="" className={styles.savedLookPreviewImg} />}
                  </div>
                  <h4 className={styles.savedLookName}>{look.name}</h4>
                  <p className={styles.savedLookMeta}>
                    {look.tags.length ? look.tags.join(", ") : "—"} · {look.visibility} · 2 items
                  </p>
                  <div className={styles.savedLookActions}>
                    <button
                      type="button"
                      className={styles.closetItemActionBtn}
                      onClick={() => {
                        setPopupTopItemIdFromCloset(look.topId);
                        setPopupBottomItemIdFromCloset(look.bottomId);
                      }}
                    >
                      Apply
                    </button>
                    <button type="button" className={styles.closetItemActionBtn}>
                      Edit
                    </button>
                    <button type="button" className={styles.closetItemActionBtn}>
                      Add all to cart
                    </button>
                    <button
                      type="button"
                      className={styles.closetItemActionBtn}
                      onClick={() => onDeleteSavedLook(look.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <>
          {/* Selected Preview Bar */}
          <div className={styles.closetSelectionBar}>
            <div className={`${styles.closetSelectionSlot} ${!closetTopItem ? styles.closetSelectionSlotEmpty : ""}`}>
              {closetTopItem ? (
                <>
                  <div className={styles.closetSelectionSlotThumb}>
                    <img src={closetTopItem.image} alt="" className={styles.closetSelectionSlotThumbImg} />
                  </div>
                  <p className={styles.closetSelectionSlotLabel}>Top: {closetTopItem.name}</p>
                </>
              ) : (
                <p className={styles.closetSelectionSlotPlaceholder}>Top: Select</p>
              )}
            </div>
            <div className={`${styles.closetSelectionSlot} ${!closetBottomItem ? styles.closetSelectionSlotEmpty : ""}`}>
              {closetBottomItem ? (
                <>
                  <div className={styles.closetSelectionSlotThumb}>
                    <img src={closetBottomItem.image} alt="" className={styles.closetSelectionSlotThumbImg} />
                  </div>
                  <p className={styles.closetSelectionSlotLabel}>Bottom: {closetBottomItem.name}</p>
                </>
              ) : (
                <p className={styles.closetSelectionSlotPlaceholder}>Bottom: Select</p>
              )}
            </div>
          </div>

          {/* Combined demo look preview (top + bottom on model) */}
          <div className={styles.closetLookPreview}>
            <div className={styles.closetLookPreviewInner}>
              <div className={styles.closetLookPreviewLayer}>
                <div
                  className={styles.closetLookPreviewLayerBase}
                  style={{ backgroundImage: EXAMPLE_MODEL.fullBodyBase ? `url(${EXAMPLE_MODEL.fullBodyBase})` : undefined }}
                />
                {closetTopItem && <span className={styles.closetLookPreviewLayerLabel}>Top: {closetTopItem.name}</span>}
              </div>
              <div className={styles.closetLookPreviewLayer}>
                <div
                  className={styles.closetLookPreviewLayerBase}
                  style={{ backgroundImage: EXAMPLE_MODEL.fullBodyBase ? `url(${EXAMPLE_MODEL.fullBodyBase})` : undefined }}
                />
                {closetBottomItem && <span className={styles.closetLookPreviewLayerLabel}>Bottom: {closetBottomItem.name}</span>}
              </div>
            </div>
          </div>

          <div className={styles.closetScrollArea}>
            <div className={styles.closetFilterRow}>
              <input
                type="search"
                className={styles.closetSearch}
                placeholder="Search by name"
                value={closetSearch}
                onChange={(e) => setClosetSearch(e.target.value)}
              />
              {(["top", "bottom", "favorite", "inStock"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.chip} ${closetFilters[key] ? styles.chipSelected : ""}`}
                  onClick={() => toggleClosetFilter(key)}
                >
                  {key === "inStock" ? "In stock" : key === "top" ? "Top" : key === "bottom" ? "Bottom" : "Favorite"}
                </button>
              ))}
            </div>
            <div className={styles.closetItemList}>
              {filteredItems.length === 0 ? (
                <p className={styles.previewStateMessage}>No items match.</p>
              ) : (
                filteredItems.map((item) => (
                  <div key={item.id} className={styles.closetItemCard}>
                    <div className={styles.closetItemThumb}>
                      <img src={item.image} alt="" className={styles.closetItemThumbImg} />
                    </div>
                    <div className={styles.closetItemBody}>
                      <p className={styles.closetItemName}>{item.name}</p>
                      <p className={styles.closetItemPrice}>${"price" in item ? item.price : "—"}</p>
                    </div>
                    <span className={styles.closetItemBadge}>{item.category}</span>
                    <div className={styles.closetItemActions}>
                      {item.category === "top" && (
                        <button
                          type="button"
                          className={styles.closetItemActionBtn}
                          onClick={() => setPopupTopItemIdFromCloset(item.id)}
                        >
                          Use as Top
                        </button>
                      )}
                      {item.category === "bottom" && (
                        <button
                          type="button"
                          className={styles.closetItemActionBtn}
                          onClick={() => setPopupBottomItemIdFromCloset(item.id)}
                        >
                          Use as Bottom
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${styles.closetItemActionBtn} ${styles.closetItemActionBtnFavorite}`}
                        onClick={() => toggleFavorite(item.id)}
                        aria-label={favorites.has(item.id) ? "Unfavorite" : "Favorite"}
                        title={favorites.has(item.id) ? "Unfavorite" : "Favorite"}
                      >
                        {favorites.has(item.id) ? "♥" : "♡"}
                      </button>
                      <button type="button" className={styles.closetItemActionBtn} title="Remove or archive">
                        …
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sticky Save Look footer */}
          <div className={styles.closetStickyFooter}>
            <p className={`${styles.closetSaveLookMessage} ${hasFullLook ? styles.closetSaveLookMessageReady : ""}`}>
              {hasFullLook ? "Your look is ready" : "Select 1 top and 1 bottom to create a look"}
            </p>
            <button
              type="button"
              className={styles.closetSaveLookBtn}
              disabled={!hasFullLook}
              onClick={() => hasFullLook && onOpenSaveLook({ topId: popupTopItemId!, bottomId: popupBottomItemId! })}
            >
              Save Look
            </button>
          </div>
        </>
      )}
    </div>
  );
}
