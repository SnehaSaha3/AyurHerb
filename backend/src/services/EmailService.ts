import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendRegistrationEmail = async (to: string, name: string) => {
  try {
    await transporter.sendMail({
      from: `"AyurHerb" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Welcome to AyurHerb 🌿",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Welcome to AyurHerb, ${name}</h2>

          <p>
            Your registration has been completed successfully.
          </p>

          <p>
            You can now log in to your account and explore the AyurHerb platform.
          </p>

          <br />

          <p>
            Regards,<br />
            <strong>AyurHerb Team</strong>
          </p>
        </div>
      `,
    });

    console.log("Registration email sent to:", to);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
