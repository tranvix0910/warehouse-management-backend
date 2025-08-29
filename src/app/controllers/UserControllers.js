import UserModel from "../models/UserModel.js";

export const getInfoUser = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Get info success", data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error?.message });
  }
};

export const changeInfoUser = async (req, res) => {
  const userId = req.user._id;
  const { username, surName, birthday, company } = req.body;

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Cập nhật các trường nếu có truyền dữ liệu
    if (username !== undefined) user.username = username;
    if (surName !== undefined) user.surName = surName;
    if (birthday !== undefined) user.birthday = birthday;
    if (company !== undefined) user.company = company;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User info updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
