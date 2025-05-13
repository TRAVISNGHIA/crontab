import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "../../../../lib/db";
import User from "../../../../models/User";
export async function POST(request) {
    try {
        await connectDB();
        const { name, password } = await request.json();

        if (!name || !password) {
            return NextResponse.json(
                { error: "Tên và password là bắt buộc" },
                { status: 400 }
            );
        }

        const user = await User.findOne({ name });
        if (!user) {
            return NextResponse.json(
                { error: "Tên hoặc mật khẩu không đúng" },
                { status: 401 }
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Tên hoặc mật khẩu không đúng" },
                { status: 401 }
            );
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("Thiếu JWT_SECRET trong môi trường");
            return NextResponse.json(
                { error: "Lỗi máy chủ" },
                { status: 500 }
            );
        }

        const token = jwt.sign(
            { userId: user._id, name: user.name },
            process.env.JWT_SECRET ,
            { expiresIn: "1h" }
        );

        return NextResponse.json(
            { message: "Đăng nhập thành công", token },
            { status: 200 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Đã có lỗi xảy ra" },
            { status: 500 }
        );
    }
}