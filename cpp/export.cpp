#include <napi.h>
#include "logger.h"
#include "AudioTools.h"

Napi::String Test(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    LOG_DEBUG << info.Length();
    Napi::String param1 = info[0].As<Napi::String>();
    LOG_INFO << "param1: " << param1.Utf8Value();
    return Napi::String::New(env, "hello world");
}

Napi::Object GetAudioMetadataTags(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    AudioMetadataTags tags;
    auto ret = AudioTools::getInstance().GetAudioMetadataTags(filePath, tags);
    if (!ret) {
        return Napi::Object::New(env);
    }
    Napi::Object retValue = Napi::Object::New(env);
    retValue.Set("title", Napi::String::New(env, tags.title));
    retValue.Set("artist", Napi::String::New(env, tags.artist));
    retValue.Set("album", Napi::String::New(env, tags.album));
    return retValue;
}

Napi::Boolean SetAudioMetadataTags(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    Napi::Object tagsObj = info[1].As<Napi::Object>();
    AudioMetadataTags tags;
    tags.title = tagsObj.Get("title").As<Napi::String>().Utf8Value();
    tags.artist = tagsObj.Get("artist").As<Napi::String>().Utf8Value();
    tags.album = tagsObj.Get("album").As<Napi::String>().Utf8Value();
    const auto ret = AudioTools::getInstance().SetAudioMetadataTags(filePath, tags);
    return Napi::Boolean::New(env, ret);
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    AudioTools::getInstance().SetLogHandler([](int level, const std::string& msg){
        if (level == AudioTools::LL_ERROR) {
            LOG_ERROR << msg;
        } else if (level == AudioTools::LL_INFO) {
            LOG_INFO << msg;
        } else if (level == AudioTools::LL_DEBUG) {
            LOG_DEBUG << msg;
        }
    });
    exports.Set("test", Napi::Function::New(env, Test));
    exports.Set("getAudioMetadataTags", Napi::Function::New(env, GetAudioMetadataTags));
    exports.Set("setAudioMetadataTags", Napi::Function::New(env, SetAudioMetadataTags));
    return exports;
}

NODE_API_MODULE(addon, Init)