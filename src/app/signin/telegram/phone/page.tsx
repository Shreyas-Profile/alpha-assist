// After a fresh Telegram sign-in, we know the user's identity (Telegram
// chatId + name), but Telegram's Login Widget doesn't share the phone
// number. Reminders + WhatsApp fallback + SMS all need a phone. Ask for
// it here as a one-time step, then land them on /chat.
//
// Users who already have a phone linked skip this page entirely (the
// handoff.tsx client component checks and routes past it).

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PhoneCollector } from "./phone-collector";

export default async function TelegramPhonePage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/signin");

  // If they already have a phone on file, skip the phone form but still
  // route via the "which Telegram chat is the bot?" explainer — they just
  // completed a fresh OAuth and need to know where to actually message me.
  const pref = await prisma.userChannelPref.findUnique({
    where: { userId: email },
    select: { whatsappNumber: true },
  });
  if (pref?.whatsappNumber) redirect("/signin/telegram/done");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center font-bold mx-auto">
            P
          </div>
          <h1 className="text-2xl font-semibold">One last thing</h1>
          <p className="text-muted-foreground text-sm">
            What&apos;s your phone number? I&apos;ll use it for reminders and
            keeping your account tied to a real number.
          </p>
        </div>
        <PhoneCollector />
      </div>
    </main>
  );
}
