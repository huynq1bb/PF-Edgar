/**
 * Sample data for Model Popup & Closet preview.
 */
export const EXAMPLE_MODEL = {
  fullBodyBase: "/examples/model/fullbody-base.png",
  portraitBase: "/examples/model/portrait-base.png",
} as const;

export const closetItems = {
  top: [
    {
      id: "top_01",
      name: "White Shirt",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTg-XH8zN8W22JJKbKK49azJPPgVWQVm4ia4w&s",
      price: 39,
    },
    {
      id: "top_02",
      name: "Black Jacket",
      image: "https://bizweb.dktcdn.net/thumb/1024x1024/100/513/302/products/z6256929548685-9ce9254a49b8a1295b40976d703af9cf-1737713846637.jpg?v=1737713849780",
      price: 79,
    },
  ],
  bottom: [
    {
      id: "bottom_01",
      name: "Blue Jeans",
      image: "https://www.mytheresa.com/media/1094/1238/100/9a/P00997095.jpg",
      price: 49,
    },
    {
      id: "bottom_02",
      name: "Pleated Skirt",
      image: "https://www.mytheresa.com/media/1094/1238/100/6d/P01118249.jpg",
      price: 45,
    },
  ],
};

/** Top/bottom with category for closet badges; face accessories for portrait mode */
export const EXAMPLE_ITEMS = {
  top: closetItems.top.map((t) => ({ ...t, category: "top" as const })),
  bottom: closetItems.bottom.map((b) => ({ ...b, category: "bottom" as const })),
  faceAccessories: [
    { id: "face_01", name: "Glasses", image: "/examples/items/face-glasses-01.png", category: "face" as const },
    { id: "face_02", name: "Hat", image: "/examples/items/face-hat-01.png", category: "face" as const },
  ],
};

export type TopItem = (typeof EXAMPLE_ITEMS.top)[number];
export type BottomItem = (typeof EXAMPLE_ITEMS.bottom)[number];
export type FaceItem = (typeof EXAMPLE_ITEMS.faceAccessories)[number];
export type ClosetItem = TopItem | BottomItem;

/** All items for closet "All" tab (with category badge) */
export const ALL_CLOSET_ITEMS: (ClosetItem & { category: "top" | "bottom" })[] = [
  ...EXAMPLE_ITEMS.top,
  ...EXAMPLE_ITEMS.bottom,
];

/** Saved Look (top + bottom combo) for Saved Looks tab */
export type SavedLook = {
  id: string;
  name: string;
  tags: string[];
  visibility: "private" | "public";
  topId: string;
  bottomId: string;
};

export const SAVE_LOOK_TAGS = ["casual", "work", "street"] as const;
