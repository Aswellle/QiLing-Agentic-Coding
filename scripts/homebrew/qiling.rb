# Homebrew formula for QiLing (启灵)
# 安装方式:
#   brew tap Aswellle/qiling
#   brew install qiling
#
# 或一行安装（无需 tap）:
#   brew install Aswellle/qiling/qiling
#
# 更新:
#   brew upgrade qiling

class Qiling < Formula
  desc "启灵 (QiLing) — AI Programming Agent for the terminal"
  homepage "https://github.com/Aswellle/QiLing-Agentic-Coding"
  version "0.5.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/Aswellle/QiLing-Agentic-Coding/releases/download/v#{version}/qiling-macos-arm64"
      # sha256 is updated automatically by .github/workflows/update-homebrew.yml after each release
      sha256 "cfb3b27c0982db543469eaef2a0b93e8714cb1eb36bdbe6ee6c23b6ab324da85"
    end
    on_intel do
      url "https://github.com/Aswellle/QiLing-Agentic-Coding/releases/download/v#{version}/qiling-macos-x64"
      sha256 "b5482e533182a637b4bef0da77f422994b481e25cedae27e7690180ff8fa9ad4"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/Aswellle/QiLing-Agentic-Coding/releases/download/v#{version}/qiling-linux-arm64"
      sha256 "d1ac46aaa3d01b09eb07125d264d9cc74e5bb1d6fe40eaf68382b2a3fc67bc85"
    end
    on_intel do
      url "https://github.com/Aswellle/QiLing-Agentic-Coding/releases/download/v#{version}/qiling-linux-x64"
      sha256 "e09703df948bc242324cc94dbb98ebb22629373643a291b2319174ec7be85e5f"
    end
  end

  def install
    # The downloaded file is the binary itself (no archive)
    bin.install stable.url.split("/").last => "qiling"
    chmod 0755, bin/"qiling"
  end

  def caveats
    <<~EOS
      启灵 (QiLing) — AI Programming Agent

      快速开始:
        qiling                          # 启动（读取 ANTHROPIC_API_KEY 等环境变量）
        ANTHROPIC_API_KEY=your-key qiling
        qiling --provider ollama --model llama3.1   # 使用本地 Ollama

      配置:
        ~/.qiling/settings.json         # 全局配置
        .qiling/settings.json           # 项目配置

      文档: https://github.com/Aswellle/QiLing-Agentic-Coding
    EOS
  end

  test do
    assert_match "qiling", shell_output("#{bin}/qiling --version")
  end
end
