import webpush from "web-push";
import { prisma } from "../db";

const getVapidKeys = () => ({
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
  subject: process.env.VAPID_SUBJECT || "mailto:admin@hotel.local",
});

const isConfigured = () => {
  const { publicKey, privateKey } = getVapidKeys();
  return Boolean(publicKey && privateKey);
};

const configure = () => {
  if (!isConfigured()) return false;
  const { publicKey, privateKey, subject } = getVapidKeys();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
};

export const getPublicKey = () => getVapidKeys().publicKey;

export const saveSubscription = async (payload: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: number | null;
  userAgent?: string;
}) => {
  return prisma.pushSubscription.upsert({
    where: { endpoint: payload.endpoint },
    update: {
      p256dh: payload.p256dh,
      auth: payload.auth,
      userId: payload.userId ?? null,
      userAgent: payload.userAgent ?? null,
    },
    create: {
      endpoint: payload.endpoint,
      p256dh: payload.p256dh,
      auth: payload.auth,
      userId: payload.userId ?? null,
      userAgent: payload.userAgent ?? null,
    },
  });
};

export const removeSubscription = async (endpoint: string) => {
  return prisma.pushSubscription.delete({ where: { endpoint } });
};

export const sendPushToAll = async (payload: {
  title: string;
  body: string;
  url?: string;
}) => {
  if (!configure()) return;

  const subs = await prisma.pushSubscription.findMany();
  const message = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      } as webpush.PushSubscription;

      try {
        await webpush.sendNotification(subscription, message);
      } catch (error: any) {
        const statusCode = error?.statusCode || error?.status;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
        } else {
          console.error("Web push send failed", error);
        }
      }
    })
  );
};
