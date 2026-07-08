import org.jetbrains.kotlin.gradle.targets.js.dsl.ExperimentalWasmDsl

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}

val repoRoot = layout.projectDirectory.dir("..")
val webrootDir = repoRoot.dir("template/webroot")

kotlin {
    @OptIn(ExperimentalWasmDsl::class)
    wasmJs {
        browser {
            commonWebpackConfig {
                outputFileName = "omk-webui.js"
            }
        }
        binaries.executable()
    }

    sourceSets {
        commonMain.dependencies {
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.ui)
            implementation(compose.components.resources)
            implementation(compose.materialIconsExtended)
            implementation(libs.miuix.ui)
            implementation(libs.miuix.preference)
            implementation(libs.miuix.icons)
            implementation(libs.navigationevent.compose)
        }
    }
}

// Copy the production build output into template/webroot/
val copyWebroot by tasks.registering(Copy::class) {
    description = "Copies WasmJs production build into template/webroot/"
    group = "omk"
    from(layout.buildDirectory.dir("dist/wasmJs/productionExecutable"))
    into(webrootDir)
    dependsOn("wasmJsBrowserDistribution")
}

// Clean the webroot before copying to remove stale files
val cleanWebroot by tasks.registering(Delete::class) {
    delete(webrootDir)
}

tasks.named("copyWebroot") {
    dependsOn("cleanWebroot")
}
