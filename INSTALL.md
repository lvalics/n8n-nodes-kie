# KIE Plugin Installation Guide

Complete guide for installing and developing the n8n-nodes-kie plugin.

## Prerequisites

- **Node.js**: >= 18.10
- **pnpm**: >= 9.1 (install with `npm install -g pnpm`)
- **n8n**: Latest version recommended
- **Docker** (optional): For Docker-based installation

## Quick Start

### Development Installation (Recommended)

```bash
# Navigate to the plugin directory
cd n8n-nodes-kie

# Run the installer
./install-dev.sh
```

This will:
- ✅ Clear n8n cache automatically
- ✅ Build the project
- ✅ Install to ~/.n8n directory
- ✅ Create symlinks for development

### Docker Installation

```bash
# Make sure your Docker container is running
docker compose up -d n8n

# Install to Docker container
./install-dev.sh --docker
```

## Installation Modes

### 1. Development Mode (Default)

**Best for**: Active development with frequent changes

```bash
./install-dev.sh
```

**Features**:
- Automatic cache clearing
- Builds from source
- Creates development symlinks
- Fast iteration workflow

**After installation**:
```bash
# Start n8n
npx n8n start

# Watch for changes (in another terminal)
pnpm run dev

# After making changes, reinstall
./install-dev.sh
```

### 2. Docker Mode

**Best for**: Container-based development

```bash
./install-dev.sh --docker
```

**Features**:
- Installs directly to n8n Docker container
- Automatic container restart
- Isolated environment

**Requirements**:
- Docker container named `n8n-dev` must be running
- Container must have pnpm available

### 3. Build & Publish Mode

**Best for**: Publishing to npm registry

```bash
./install-dev.sh --build
```

**Features**:
- Interactive version bumping (patch/minor/major)
- Automatic npm publishing
- Git workflow guidance

**Requirements**:
- Must be logged into npm (`npm login`)
- Git repository should be clean

## Command Options

| Option | Description |
|--------|-------------|
| `--docker` | Install to Docker container |
| `--build` | Build and publish to npm |
| `--no-cache-clear` | Skip automatic cache clearing |

## Development Workflow

### Initial Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm run build

# 3. Install to n8n
./install-dev.sh
```

### Active Development

```bash
# Terminal 1: Watch for changes
pnpm run dev

# Terminal 2: Run n8n
npx n8n start

# After making changes: reinstall
./install-dev.sh
```

### Testing Changes

```bash
# 1. Make your code changes
# 2. Rebuild (automatic with dev mode)
# 3. Reinstall
./install-dev.sh

# 4. Restart n8n (Ctrl+C, then npx n8n start)
# 5. Refresh browser
```

## Troubleshooting

### Node Doesn't Appear in n8n

**Solution 1**: Clear cache manually
```bash
rm -rf ~/.n8n/.cache
npx n8n start
```

**Solution 2**: Verify installation
```bash
ls -la ~/.n8n/custom/dist
ls -la ~/.n8n/nodes
```

**Solution 3**: Check n8n environment
```bash
export N8N_CUSTOM_EXTENSIONS="$HOME/.n8n/custom"
npx n8n start
```

### Build Failures

**Check Node version**:
```bash
node --version  # Should be >= 18.10
```

**Clean and rebuild**:
```bash
pnpm run clean
rm -rf node_modules
pnpm install
pnpm run build
```

### pnpm Link Errors

If you see `ERR_PNPM_NO_GLOBAL_BIN_DIR`:
```bash
# Setup pnpm global bin directory
pnpm setup

# Or set PNPM_HOME manually
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
```

**Note**: The installer continues successfully even with this warning, using the fallback copy method.

### Docker Installation Issues

**Container not found**:
```bash
# Check container status
docker ps | grep n8n

# Start container
docker compose up -d n8n
```

**Permission issues**:
```bash
# Check Docker permissions
docker exec n8n-dev whoami

# May need to adjust volume permissions
```

## Directory Structure

After installation, files are located at:

```
~/.n8n/
├── custom/
│   ├── dist/           # Built plugin code
│   └── package.json    # Package metadata
├── nodes/
│   └── n8n-nodes-kie   # Symlink to source
└── n8n-nodes-kie-*.tgz # Packaged plugin
```

## Cache Management

The installer automatically clears the n8n cache on each run to ensure fresh installations. This prevents stale node definitions and ensures changes are picked up immediately.

**Manual cache clearing**:
```bash
rm -rf ~/.n8n/.cache
```

**Skip automatic cache clearing**:
```bash
./install-dev.sh --no-cache-clear
```

## Environment Variables

Optional but recommended for development:

```bash
# Add to ~/.bashrc or ~/.zshrc
export N8N_CUSTOM_EXTENSIONS="$HOME/.n8n/custom"

# For development logging
export N8N_LOG_LEVEL=debug
```

## Publishing Workflow

When ready to publish a new version:

```bash
# 1. Ensure clean git state
git status

# 2. Run build & publish
./install-dev.sh --build

# 3. Follow interactive prompts
#    - Select version bump (patch/minor/major)
#    - Confirm publish

# 4. Follow post-publish steps
git add package.json pnpm-lock.yaml
git commit -m "chore: bump version to x.x.x"
git push origin main
git tag vx.x.x
git push origin vx.x.x
```

## Wrapper Script

A convenience wrapper is available at the project root:

```bash
# From n8n_dev directory
./install-kie-plugin.sh          # Normal install
./install-kie-plugin.sh --docker # Docker install
```

This automatically navigates to the plugin directory and runs the installer.

## Additional Resources

- **Development**: Run `pnpm run dev` for watch mode
- **Format**: Run `pnpm run format` to format code
- **Clean**: Run `pnpm run clean` to remove build artifacts
- **n8n Docs**: https://docs.n8n.io/integrations/creating-nodes/
- **KIE API**: https://kie.ai/docs

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Verify prerequisites are installed
3. Check n8n logs for error messages
4. Open an issue at: https://github.com/lvalics/n8n-nodes-kie/issues
