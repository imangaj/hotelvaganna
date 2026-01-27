import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

const defaultProfile = {
  name: "Ponale Apartments & Suites",
  address: "Viale Barbera, 49",
  city: "Milano",
  country: "Italy",
  description: "Avvolta nel verde del parco Nord, Ponale Apartments & Suites si trova a pochi passi dalla metro lilla Ponale.",
  amenities: "Wi-Fi illimitata, Smart TV, Nespresso, Cucina attrezzata, Aria condizionata",
  checkInTime: "15:00",
  checkOutTime: "10:00",
  policies: "Valid ID required at check-in. No smoking inside rooms.",
  heroImageUrl: "",
  // Website Defaults
  websiteTitle: "Ponale Apartments & Suites",
  logoUrl: "",
  primaryColor: "#2E5D4B",
  secondaryColor: "#C5A059",
  footerText: "Experience comfort and nature in the heart of the park.",
  footerCopyright: "© 2026 Ponale Apartments & Suites",
  facebookUrl: "",
  instagramUrl: "",
  twitterUrl: "",
  contentJson: {
    rules: { show: true, title: "Hotel Rules", content: "" },
    receipt: { cityTaxPerPersonPerNight: 7.4 }
  }
};

router.get("/", async (_req: Request, res: Response) => {
  try {
    const profile = await prisma.hotelProfile.findFirst();
    if (profile) {
        // Parse JSON string back to object safely
        let parsedContent = {};
        try {
            parsedContent = profile.contentJson ? JSON.parse(profile.contentJson) : {};
        } catch (e) {
            console.warn("Failed to parse contentJson, using default empty object");
        }

        const profileResponse = {
            ...profile,
            contentJson: parsedContent
        };
        res.json(profileResponse);
    } else {
        res.json(defaultProfile);
    }
  } catch (error) {
    console.error("Fetch hotel profile error:", error);
    res.status(500).json({ message: "Failed to fetch hotel profile" });
  }
});

router.put("/", async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const existing = await prisma.hotelProfile.findFirst();

    const data = {
      name: payload.name !== undefined ? payload.name : defaultProfile.name,
      address: payload.address !== undefined ? payload.address : defaultProfile.address,
      city: payload.city !== undefined ? payload.city : defaultProfile.city,
      country: payload.country !== undefined ? payload.country : defaultProfile.country,
      phone: payload.phone || null,
      email: payload.email || null,
      description: payload.description || null,
      amenities: payload.amenities || null,
      checkInTime: payload.checkInTime || null,
      checkOutTime: payload.checkOutTime || null,
      policies: payload.policies || null,
      heroImageUrl: payload.heroImageUrl || null,
      // Website Fields
      websiteTitle: payload.websiteTitle || null,
      logoUrl: payload.logoUrl || null,
      primaryColor: payload.primaryColor || "#2E5D4B",
      secondaryColor: payload.secondaryColor || "#C5A059",
      footerText: payload.footerText || null,
      footerCopyright: payload.footerCopyright || null,
      facebookUrl: payload.facebookUrl || null,
      instagramUrl: payload.instagramUrl || null,
      twitterUrl: payload.twitterUrl || null,
      contentJson: payload.contentJson ? JSON.stringify(payload.contentJson) : "{}"
    };

    const profile = existing
      ? await prisma.hotelProfile.update({ where: { id: existing.id }, data })
      : await prisma.hotelProfile.create({ data });
    
    // Parse JSON string back to object for response
    let parsedContent = {};
    try {
        parsedContent = profile.contentJson ? JSON.parse(profile.contentJson) : {};
    } catch (e) {
        console.warn("Failed to parse contentJson after update", e);
    }

    const profileResponse = {
        ...profile,
        contentJson: parsedContent
    };

    res.json(profileResponse);
  } catch (error) {
    console.error("Update hotel profile error:", error);
    res.status(500).json({ message: "Failed to update hotel profile" });
  }
});

export default router;
