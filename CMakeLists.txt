cmake_minimum_required(VERSION 3.20)
project (addon)


# Include N-API wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        )
string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})


# Define NAPI_VERSION
add_definitions(-DNAPI_VERSION=3)

add_subdirectory(first-party)
#link_directories(first-party/conan-build/build/Release/LibAudio/lib)
include_directories(first-party/LibAudio/lib)
#link_directories(first-party/conan-build/build/Release/logger)
include_directories(first-party/logger)

add_subdirectory(cpp)