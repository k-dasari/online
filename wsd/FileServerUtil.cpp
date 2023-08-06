/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4; fill-column: 100 -*- */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#include <config.h>

#include "FileServer.hpp"
#include "StringVector.hpp"
#include "Util.hpp"

#include <Poco/JSON/Object.h>

PreProcessedFile::PreProcessedFile(std::string filename, const std::string& data)
    : _filename(std::move(filename))
    , _size(data.length())
{
    std::size_t pos = 0; //< The current position to search from.
    std::size_t lastpos = 0; //< The last position in a literal string.

    do
    {
        std::size_t newpos = data.find_first_of("<%", pos);
        if (newpos == std::string::npos || newpos + 2 >= _size)
        {
            // Not enough data to parse a variable.
            break;
        }

        assert(newpos + 2 < _size && "Expected at least 3 characters for variable");

        if (data[newpos] == '<')
        {
            if (newpos + 5 < _size && data.compare(newpos + 1, 4, "!--%") != 0)
            {
                // Just a tag; continue searching.
                pos = newpos + 1;
                continue;
            }

            std::size_t nestedpos = data.find_first_of("<>", newpos + 1);
            if (nestedpos != std::string::npos && data[nestedpos] == '<')
            {
                // We expected to find the end of comment before a new tag.
                // Resume searching.
                pos = nestedpos;
                continue;
            }

            // Find the matching closing comment
            std::size_t endpos = data.find_first_of('>', newpos + 1);
            if (endpos == std::string::npos)
            {
                // Broken comment.
                break;
            }

            // Extract variable name.
            const std::size_t varstart = data.find_first_of('%', newpos);
            if (varstart == std::string::npos || varstart > endpos)
            {
                // Comment without a variable.
                pos = endpos + 1;
                continue;
            }

            const std::size_t varend = data.find_first_of('%', varstart + 1);
            if (varend == std::string::npos || varend > endpos)
            {
                // Comment without a variable.
                pos = endpos + 1;
                continue;
            }

            // Insert previous literal.
            if (newpos > lastpos)
            {
                _segments.emplace_back(false, data.substr(lastpos, newpos - lastpos));
            }

            lastpos = endpos + 1;
            _segments.emplace_back(true, data.substr(varstart + 1, varend - varstart - 1));
        }
        else
        {
            assert(data[newpos] == '%' && "Expected '%' at given position");

            // Extract variable name.
            const std::size_t varend = data.find_first_of('%', newpos + 1);
            if (varend == std::string::npos)
            {
                // Broken variable.
                break;
            }

            // Insert previous literal.
            if (newpos > lastpos)
            {
                _segments.emplace_back(false, data.substr(lastpos, newpos - lastpos));
            }

            lastpos = varend + 1;
            _segments.emplace_back(true, data.substr(newpos + 1, varend - newpos - 1));
        }

        pos = lastpos;
    } while (pos < _size);

    if (lastpos < _size)
    {
        _segments.emplace_back(false, data.substr(lastpos));
    }
}

std::string FileServerRequestHandler::uiDefaultsToJSON(const std::string& uiDefaults, std::string& uiMode, std::string& uiTheme)
{
    static std::string previousUIDefaults;
    static std::string previousJSON("{}");
    static std::string previousUIMode;

    // early exit if we are serving the same thing
    if (uiDefaults == previousUIDefaults)
    {
        uiMode = previousUIMode;
        return previousJSON;
    }

    Poco::JSON::Object json;
    Poco::JSON::Object textDefs;
    Poco::JSON::Object spreadsheetDefs;
    Poco::JSON::Object presentationDefs;
    Poco::JSON::Object drawingDefs;

    uiMode = "";
    uiTheme = "light";
    StringVector tokens(StringVector::tokenize(uiDefaults, ';'));
    for (const auto& token : tokens)
    {
        StringVector keyValue(StringVector::tokenize(tokens.getParam(token), '='));
        Poco::JSON::Object* currentDef = nullptr;
        std::string key;

        // detect the UIMode or component
        if (keyValue.equals(0, "UIMode"))
        {
            if (keyValue.equals(1, "compact") || keyValue.equals(1, "classic"))
            {
                json.set("uiMode", "classic");
                uiMode = "classic";
            }
            else if(keyValue.equals(1, "tabbed") || keyValue.equals(1, "notebookbar"))
            {
                json.set("uiMode", "notebookbar");
                uiMode = "notebookbar";
            }
            else
                LOG_ERR("unknown UIMode value " << keyValue[1]);

            continue;
        }

        // detect the UITheme default, light or dark
        if (keyValue.equals(0, "UITheme"))
        {
                json.set("darkTheme", keyValue.equals(1, "dark"));
                uiTheme = keyValue[1];
        }
        if (keyValue.equals(0, "SaveAsMode"))
        {
            if (keyValue.equals(1, "group"))
            {
                json.set("saveAsMode", "group");
            }
            continue;
        }
        else if (keyValue.startsWith(0, "Text"))
        {
            currentDef = &textDefs;
            key = keyValue[0].substr(4);
        }
        else if (keyValue.startsWith(0, "Spreadsheet"))
        {
            currentDef = &spreadsheetDefs;
            key = keyValue[0].substr(11);
        }
        else if (keyValue.startsWith(0, "Presentation"))
        {
            currentDef = &presentationDefs;
            key = keyValue[0].substr(12);
        }
        else if (Util::startsWith(keyValue[0], "Drawing"))
        {
            currentDef = &drawingDefs;
            key = keyValue[0].substr(7);
        }
        else
        {
            LOG_ERR("unknown UI default's component " << keyValue[0]);
            continue;
        }

        assert(currentDef);

        // detect the actual UI widget we want to hide or show
        if (key == "Ruler" || key == "Sidebar" || key == "Statusbar")
        {
            bool value(true);
            if (keyValue.equals(1, "false") || keyValue.equals(1, "False") || keyValue.equals(1, "0"))
                value = false;

            currentDef->set("Show" + key, value);
        }
        else
        {
            LOG_ERR("unknown UI default " << keyValue[0]);
            continue;
        }
    }

    if (textDefs.size() > 0)
        json.set("text", textDefs);

    if (spreadsheetDefs.size() > 0)
        json.set("spreadsheet", spreadsheetDefs);

    if (presentationDefs.size() > 0)
        json.set("presentation", presentationDefs);

    if (drawingDefs.size() > 0)
        json.set("drawing", drawingDefs);

    std::ostringstream oss;
    Poco::JSON::Stringifier::stringify(json, oss);

    previousUIDefaults = uiDefaults;
    previousJSON = oss.str();
    previousUIMode = uiMode;

    return previousJSON;
}

std::string FileServerRequestHandler::checkFileInfoToJSON(const std::string& checkfileInfo)
{
    static std::string previousCheckFileInfo;
    static std::string previousCheckFileInfoJSON("{}");

    // early exit if we are serving the same thing
    if (checkfileInfo == previousCheckFileInfo)
        return previousCheckFileInfoJSON;

    Poco::JSON::Object json;
    StringVector tokens(StringVector::tokenize(checkfileInfo, ';'));
    for (const auto& token : tokens)
    {
        StringVector keyValue(StringVector::tokenize(tokens.getParam(token), '='));
        if (keyValue.equals(0, "DownloadAsPostMessage"))
        {
            bool value(false);
            if (keyValue.equals(1, "true") || keyValue.equals(1, "True") || keyValue.equals(1, "1"))
                value = true;
            json.set(keyValue[0], value);
        }
    }
    std::ostringstream oss;
    Poco::JSON::Stringifier::stringify(json, oss);
    previousCheckFileInfo = checkfileInfo;
    previousCheckFileInfoJSON = oss.str();
    return previousCheckFileInfoJSON;
}

namespace
{
bool isValidCss(const std::string& token)
{
    const std::string forbidden = "<>{}&|\\\"^`'$[]";
    for (auto c: token)
    {
        if (c < 0x20 || c >= 0x7F || forbidden.find(c) != std::string::npos)
            return false;
    }
    return true;
}
}

std::string FileServerRequestHandler::cssVarsToStyle(const std::string& cssVars)
{
    static std::string previousVars;
    static std::string previousStyle;

    // early exit if we are serving the same thing
    if (cssVars == previousVars)
        return previousStyle;

    std::ostringstream styleOSS;
    styleOSS << "<style>:root {";
    StringVector tokens(StringVector::tokenize(cssVars, ';'));
    for (const auto& token : tokens)
    {
        StringVector keyValue(StringVector::tokenize(tokens.getParam(token), '='));
        if (keyValue.size() < 2)
        {
            LOG_ERR("Skipping the token [" << tokens.getParam(token) << "] since it does not have '='");
            continue;
        }
        else if (keyValue.size() > 2)
        {
            LOG_ERR("Skipping the token [" << tokens.getParam(token) << "] since it has more than one '=' pair");
            continue;
        }

        if (!isValidCss(tokens.getParam(token)))
        {
            LOG_WRN("Skipping the token [" << tokens.getParam(token) << "] since it contains forbidden characters");
            continue;
        }

        styleOSS << keyValue[0] << ':' << keyValue[1] << ';';
    }
    styleOSS << "}</style>";

    previousVars = cssVars;
    previousStyle = styleOSS.str();

    return previousStyle;
}

std::string FileServerRequestHandler::stringifyBoolFromConfig(
                                                const Poco::Util::LayeredConfiguration& config,
                                                std::string propertyName,
                                                bool defaultValue)
{
    std::string value = "false";
    if (config.getBool(propertyName, defaultValue))
        value = "true";
    return value;
}

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
