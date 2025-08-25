import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()


const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, 
  port: Number(process.env.MAIL_PORT), 
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})
export const sendRegistrationEmail = async (to: string, name: string) => {
  try {
    await transporter.sendMail({
      from: `"AyurMate" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Welcome to AyurMate 🌿",
      html: `
        <h2>Hello ${name},</h2>
        <p>Welcome to <b>AyurMate</b>! 🎉</p>
        <p>Your registration was successful. You can now log in and explore the platform.</p>
        <br/>
        <p>Regards,</p>
        <p><b>AyurMate Team</b></p>
      `,
    })

    console.log("✅ Registration email sent to:", to)
  } catch (error) {
    console.error("❌ Error sending email:", error)
  }
}
