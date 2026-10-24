export type GiftAccount = { id: string; provider: string; number: string; owner: string };
export type GiftSettings = {
  accounts: GiftAccount[];
  shipping: { recipient: string; address: string } | null;
};

// Isi data asli sebelum mengaktifkan penerimaan hadiah.
export const weddingGift: GiftSettings = {
  accounts: [
    { id: "bni", provider: "BNI", number: "1234567890", owner: "Shinta" },
    { id: "bca", provider: "BCA", number: "1234567890", owner: "Ryan" },
    { id: "shopeepay", provider: "ShopeePay", number: "08123456789", owner: "Shinta)" },
  ],
  shipping: { recipient: "Shinta & Ryan", address: "Alamat pengiriman hadiah akan ditambahkan." },
};

// Hanya untuk /preview; tidak pernah dipakai sebagai rekening undangan tamu.
export const demoWeddingGift: GiftSettings = {
  accounts: [
    { id: "bni", provider: "BNI", number: "1234567890", owner: "Nama pemilik rekening (contoh)" },
    { id: "bca", provider: "BCA", number: "1234567890", owner: "Nama pemilik rekening (contoh)" },
    { id: "shopeepay", provider: "ShopeePay", number: "08123456789", owner: "Nama pemilik akun (contoh)" },
  ],
  shipping: { recipient: "Shinta & Ryan (contoh)", address: "Alamat pengiriman hadiah akan ditambahkan." },
};
